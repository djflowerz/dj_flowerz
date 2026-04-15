// worker/api/community/chat.js
// DJ Flowerz — P2P Escrow Chat Engine
// Features: Trusted identity, Anti-leakage masking, Transactional context

import { getAuthorizedUser } from '../../utils/auth.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Regex to catch Kenyan phone numbers: 07XX..., 01XX..., +254...
const PHONE_RE = /(?:(?:\+254|0)[17]\d{8})|(?:\d{3}[-\s]?\d{3}[-\s]?\d{4})/g;

export async function handleEscrowChat(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const url = new URL(request.url);
    const method = request.method;
    
    // Path format: /api/community/escrow-chat/:escrowId
    const parts = url.pathname.split('/').filter(Boolean);
    const escrowId = parts[parts.length - 1];

    if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // Validate the user is part of this escrow
    const escrow = await env.DB.prepare('SELECT buyer_id, seller_id FROM escrow_transactions WHERE id = ?')
        .bind(escrowId).first();
    
    if (!escrow) return new Response(JSON.stringify({ error: 'Escrow not found' }), { status: 404, headers: corsHeaders });
    if (escrow.buyer_id !== user.id && escrow.seller_id !== user.id && user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: corsHeaders });
    }

    if (method === 'GET') {
        const { results: messages } = await env.DB.prepare(`
            SELECT m.*, p.username as sender_name, p.avatar_url as sender_avatar
            FROM escrow_messages m
            JOIN profiles p ON m.sender_id = p.id
            WHERE m.escrow_id = ?
            ORDER BY m.created_at ASC
        `).bind(escrowId).all();
        
        return Response.json({ messages }, { headers: corsHeaders });
    }

    if (method === 'POST') {
        const { content, attachment_url } = await request.json();
        if (!content && !attachment_url) return new Response('Content required', { status: 400, headers: corsHeaders });

        // ANTI-LEAKAGE: Mask phone numbers to keep deals on-platform
        const maskedContent = content ? content.replace(PHONE_RE, '[NUMBER MASKED FOR SAFETY]') : '';

        const msgId = `emsg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        await env.DB.prepare(`
            INSERT INTO escrow_messages (id, escrow_id, sender_id, content, attachment_url, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(msgId, escrowId, user.id, maskedContent, attachment_url || null).run();

        // Notify the other party
        const otherId = user.id === escrow.buyer_id ? escrow.seller_id : escrow.buyer_id;
        await env.DB.prepare(`
            INSERT INTO notifications (id, user_id, type, reference_id, message, is_read, created_at)
            VALUES (?, ?, 'escrow_message', ?, ?, 0, CURRENT_TIMESTAMP)
        `).bind(
            `notif_${crypto.randomUUID().slice(0, 8)}`,
            otherId,
            escrowId,
            `New message regarding your deal from ${user.username || 'User'}`
        ).run();

        return Response.json({ success: true, message: { id: msgId, content: maskedContent } }, { headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
}
