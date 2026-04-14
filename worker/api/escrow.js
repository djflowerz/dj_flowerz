// worker/api/escrow.js
// Handles P2P Escrow transactions for the community marketplace.

import { getAuthorizedUser } from '../utils/auth.js';
import { createNotification } from './dashboard/notifications.js';

export async function handleEscrow(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const orderId = pathParts[pathParts.length - 1];

    try {
        const user = await getAuthorizedUser(request, env);
        if (!user) return new Response('Unauthorized', { status: 401 });

        // GET /api/escrow/orders
        if (request.method === 'GET' && url.pathname === '/api/escrow/orders') {
            const corsHeaders = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            };

            if (request.method === "OPTIONS") {
                return new Response(null, { headers: corsHeaders });
            }

            try {
                const results = await env.DB.prepare(`
                    SELECT e.*, p.content as post_content, p.author_name as seller_name, p.author_avatar as seller_avatar
                    FROM escrow_orders e
                    JOIN community_posts p ON e.post_id = p.id
                    WHERE e.buyer_id = ? OR e.seller_id = ?
                    ORDER BY e.created_at DESC
                `).bind(user.id, user.id).all().then(res => res.results).catch(() => []);

                const buying = results.filter(r => r.buyer_id === user.id);
                const selling = results.filter(r => r.seller_id === user.id);

                return new Response(JSON.stringify({ buying, selling }), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            } catch (err) {
                return new Response(JSON.stringify({ buying: [], selling: [] }), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    status: 200
                });
            }
        }

        // GET /api/escrow/order/:id
        if (request.method === 'GET' && orderId) {
            const order = await env.DB.prepare(`
                SELECT e.*, p.author_name as seller_name, p.author_avatar as seller_avatar
                FROM escrow_orders e
                JOIN community_posts p ON e.post_id = p.id
                WHERE e.id = ? AND (e.buyer_id = ? OR e.seller_id = ? OR ? = 'admin')
            `).bind(orderId, user.id, user.id, user.role).first();
            
            if (!order) return new Response('Order not found', { status: 404 });
            return Response.json(order);
        }

        // POST /api/escrow/order
        if (request.method === 'POST') {
            const { post_id, shipping_address } = await request.json();
            
            // 1. Fetch post info
            const post = await env.DB.prepare(`SELECT * FROM community_posts WHERE id = ?`).bind(post_id).first();
            if (!post || !post.is_marketplace) return new Response('Invalid listing', { status: 400 });
            if (post.user_id === user.id) return new Response('Cannot buy your own item', { status: 400 });

            // 1b. Check for an ACCEPTED offer for this buyer/post
            const acceptedOffer = await env.DB.prepare(`
                SELECT amount FROM community_offers 
                WHERE post_id = ? AND buyer_id = ? AND status = 'accepted'
                LIMIT 1
            `).bind(post_id, user.id).first();

            const finalPrice = acceptedOffer ? acceptedOffer.amount : post.price;

            // 2. Create the escrow order
            const id = `esc_${crypto.randomUUID().substring(0, 8)}`;
            await env.DB.prepare(`
                INSERT INTO escrow_orders (id, post_id, buyer_id, seller_id, amount, shipping_address, status)
                VALUES (?, ?, ?, ?, ?, ?, 'HELD')
            `).bind(id, post_id, user.id, post.user_id, finalPrice, shipping_address).run();

            // 3. Notify Seller
            await createNotification(env, {
                userId: post.user_id,
                actorId: user.id,
                actorName: user.name || user.full_name || 'A user',
                actorAvatar: user.avatarUrl || user.avatar_url,
                type: 'escrow_new',
                targetId: id,
                message: `purchased your item for KES ${finalPrice.toLocaleString()}. Funds are HELD in escrow.`
            });

            return Response.json({ success: true, orderId: id });
        }

        // PATCH /api/escrow/order/:id
        if (request.method === 'PATCH' && orderId) {
            const body = await request.json();
            const { status, tracking_number, dispute_reason } = body;

            // Fetch current order
            const order = await env.DB.prepare(`SELECT * FROM escrow_orders WHERE id = ?`).bind(orderId).first();
            if (!order) return new Response('Order not found', { status: 404 });

            // State Machine
            let allowed = false;
            if (status === 'SHIPPED' && user.id === order.seller_id) allowed = true;
            if (status === 'DELIVERED' && user.id === order.buyer_id) allowed = true;
            if (status === 'DISPUTED') allowed = true;
            if (status === 'RELEASED' && (user.id === order.buyer_id || user.role === 'admin')) allowed = true;

            if (!allowed) return new Response('Action not allowed', { status: 403 });

            await env.DB.prepare(`
                UPDATE escrow_orders
                SET status = COALESCE(?, status),
                    tracking_number = COALESCE(?, tracking_number),
                    dispute_reason = COALESCE(?, dispute_reason),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(status || null, tracking_number || null, dispute_reason || null, orderId).run();

            // Notify counterpart
            const targetUserId = (user.id === order.buyer_id) ? order.seller_id : order.buyer_id;
            await createNotification(env, {
                userId: targetUserId,
                actorId: user.id,
                actorName: user.name,
                actorAvatar: user.avatarUrl,
                type: `escrow_${status.toLowerCase()}`,
                targetId: orderId,
                message: `updated order ${orderId} status to ${status}.`
            });

            // If RELEASED, move funds to seller's referral/balance (simplified logic for now)
            if (status === 'RELEASED') {
                await env.DB.prepare(`
                    UPDATE profiles 
                    SET referral_balance_kes = referral_balance_kes + ?
                    WHERE id = ?
                `).bind(order.amount, order.seller_id).run();
                
                await createNotification(env, {
                    userId: order.seller_id,
                    type: 'escrow_payout',
                    message: `KES ${order.amount.toLocaleString()} has been added to your balance from order ${orderId}.`
                });
            }

            return Response.json({ success: true });
        }

        return new Response('Method Not Allowed', { status: 405 });
    } catch (e) {
        console.error('[EscrowAPI]', e.message);
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }
        });
    }
}
