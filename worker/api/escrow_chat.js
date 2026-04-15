// worker/api/escrow_chat.js
import { getAuthorizedUser } from '../utils/auth.js';
import { PushService } from '../utils/push_service.js';

export async function handleEscrowChat(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(request.url);
    const method = request.method;
    const parts = url.pathname.split('/').filter(Boolean);
    // Path: /api/escrow/:id/chat
    const escrowId = parts[parts.length - 2];

    // 1. Fetch History
    if (method === 'GET') {
        const rows = await env.DB.prepare(`
            SELECT m.*, p.username, p.full_name
            FROM escrow_messages m
            JOIN profiles p ON m.sender_id = p.id
            WHERE m.escrow_id = ?
            ORDER BY m.created_at ASC
        `).bind(escrowId).all();
        return Response.json({ messages: rows.results });
    }

    // 2. Send Message
    if (method === 'POST') {
        const { content, attachment_url } = await request.json();
        if (!content && !attachment_url) return new Response("Content required", { status: 400 });

        const escrow = await env.DB.prepare('SELECT buyer_id, seller_id, item_description FROM escrow_transactions WHERE id = ?').bind(escrowId).first();
        if (!escrow) return new Response("Escrow not found", { status: 404 });

        // Security: Only buyer or seller can chat
        if (user.id !== escrow.buyer_id && user.id !== escrow.seller_id) {
            return new Response("Not authorized", { status: 403 });
        }

        const msgId = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        await env.DB.prepare(`
            INSERT INTO escrow_messages (id, escrow_id, sender_id, content, attachment_url, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(msgId, escrowId, user.id, content || '', attachment_url || null).run();

        // ── PUSH NOTIFICATION ──
        const recipientId = user.id === escrow.buyer_id ? escrow.seller_id : escrow.buyer_id;
        
        try {
            const subscriptions = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').bind(recipientId).all();
            if (subscriptions.results.length > 0) {
                const push = new PushService(env);
                const senderName = user.full_name || user.username || 'Someone';
                
                const payload = {
                    title: `Message: ${escrow.item_description}`,
                    body: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                    url: `/escrow/${escrowId}`,
                    tag: `chat-${escrowId}`
                };

                await Promise.all(subscriptions.results.map(sub => {
                    const subObj = {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    };
                    return push.sendNotification(subObj, payload);
                }));
            }
        } catch (e) {
            console.error('[Chat/Push] Failed to send push:', e.message);
        }

        return Response.json({ success: true, id: msgId });
    }

    return new Response("Method Not Allowed", { status: 405 });
}
