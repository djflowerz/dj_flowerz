// worker/api/community/offers.js
import { getAuthorizedUser } from '../../utils/auth.js';
import { createNotification } from '../dashboard/notifications.js';

/**
 * Handle negotiation offers for marketplace posts
 * GET    /api/community/offers        - List user's offers (sent or received)
 * POST   /api/community/offers        - Make a new offer
 * PATCH  /api/community/offers/:id    - Update offer status (accept/reject)
 */
export async function handleOffers(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const offerId = pathParts[pathParts.length - 1] !== 'offers' ? pathParts[pathParts.length - 1] : null;

    try {
        // --- 1. LIST OFFERS ---
        if (request.method === 'GET') {
            const type = url.searchParams.get('type') || 'received'; // 'sent' or 'received'
            
            let query = `
                SELECT o.*, 
                       p.content as post_content, 
                       p.price as list_price,
                       b.full_name as buyer_name,
                       b.avatar_url as buyer_avatar,
                       s.full_name as seller_name,
                       s.avatar_url as seller_avatar
                FROM community_offers o
                JOIN community_posts p ON o.post_id = p.id
                JOIN profiles b ON o.buyer_id = b.id
                JOIN profiles s ON o.seller_id = s.id
            `;

            if (type === 'sent') {
                query += ` WHERE o.buyer_id = ? ORDER BY o.created_at DESC`;
            } else {
                query += ` WHERE o.seller_id = ? ORDER BY o.created_at DESC`;
            }

            const { results } = await env.DB.prepare(query).bind(user.id).all();
            return Response.json({ success: true, offers: results });
        }

        // --- 2. MAKE OFFER ---
        if (request.method === 'POST') {
            const body = await request.json();
            const { postId, amount } = body;

            if (!postId || !amount) {
                return Response.json({ error: 'Missing postId or amount' }, { status: 400 });
            }

            // Fetch post to get seller ID and validation
            const post = await env.DB.prepare(`SELECT user_id, content FROM community_posts WHERE id = ?`).bind(postId).first();
            if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });
            if (post.user_id === user.id) return Response.json({ error: 'Cannot offer on your own post' }, { status: 400 });

            const id = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO community_offers (id, post_id, buyer_id, seller_id, amount, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `).bind(id, postId, user.id, post.user_id, amount).run();

            // Notify seller
            await createNotification(env, {
                userId: post.user_id,
                actorId: user.id,
                actorName: user.full_name || 'A user',
                actorAvatar: user.avatar_url,
                type: 'marketplace_offer',
                targetId: id,
                message: `made an offer of KES ${amount} on your listing.`
            });

            return Response.json({ success: true, offerId: id });
        }

        // --- 3. ACCEPT/REJECT OFFER ---
        if (request.method === 'PATCH' && offerId) {
            const body = await request.json();
            const { status } = body; // 'accepted' or 'rejected'

            if (!['accepted', 'rejected'].includes(status)) {
                return Response.json({ error: 'Invalid status' }, { status: 400 });
            }

            // Verify ownership (only seller can accept/reject)
            const offer = await env.DB.prepare(`
                SELECT o.*, p.content 
                FROM community_offers o 
                JOIN community_posts p ON o.post_id = p.id 
                WHERE o.id = ?
            `).bind(offerId).first();

            if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });
            if (offer.seller_id !== user.id) return Response.json({ error: 'Unauthorized' }, { status: 403 });

            await env.DB.prepare(`
                UPDATE community_offers 
                SET status = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).bind(status, offerId).run();

            // Notify buyer
            await createNotification(env, {
                userId: offer.buyer_id,
                actorId: user.id,
                actorName: user.full_name || 'Seller',
                actorAvatar: user.avatar_url,
                type: status === 'accepted' ? 'offer_accepted' : 'offer_rejected',
                targetId: offer.post_id,
                message: `${status} your offer on their listing.`
            });

            return Response.json({ success: true });
        }

        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    } catch (err) {
        console.error('[OffersAPI] Error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
