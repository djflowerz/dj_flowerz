// worker/api/marketplace.js
import { getAuthorizedUser } from '../utils/auth.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handleMarketplace(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Routes: GET /api/community/marketplace (all)
    //         GET /api/community/marketplace/:id
    //         POST /api/community/marketplace/create
    //         GET /api/community/marketplace/user/:id (my listings)
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const user = await getAuthorizedUser(request, env);

        // 1. GET ALL LISTINGS
        if (request.method === 'GET' && (pathParts.length === 2)) {
            const category = url.searchParams.get('category');
            const condition = url.searchParams.get('condition');
            const query = url.searchParams.get('q');
            
            let sql = `
                SELECT m.*, p.full_name as seller_name, p.avatar_url as seller_avatar, p.username as seller_username
                FROM marketplace_listings m
                LEFT JOIN profiles p ON m.seller_id = p.id
                WHERE m.status = 'active'
            `;
            const params = [];

            if (category) {
                sql += ` AND m.category = ?`;
                params.push(category);
            }
            if (condition) {
                sql += ` AND m.condition = ?`;
                params.push(condition);
            }
            if (query) {
                sql += ` AND (m.title LIKE ? OR m.description LIKE ?)`;
                params.push(`%${query}%`, `%${query}%`);
            }

            sql += ` ORDER BY m.created_at DESC LIMIT 50`;
            const { results } = await env.DB.prepare(sql).bind(...params).all();
            
            return Response.json(results, { headers: corsHeaders });
        }

        // 2. GET SINGLE LISTING
        if (request.method === 'GET' && pathParts.length === 3 && pathParts[2] !== 'user' && pathParts[2] !== 'create') {
            const id = pathParts[2];
            const listing = await env.DB.prepare(`
                SELECT m.*, p.full_name as seller_name, p.avatar_url as seller_avatar, p.username as seller_username
                FROM marketplace_listings m
                LEFT JOIN profiles p ON m.seller_id = p.id
                WHERE m.id = ?
            `).bind(id).first();

            if (!listing) return new Response('Not Found', { status: 404, headers: corsHeaders });
            return Response.json(listing, { headers: corsHeaders });
        }

        // 3. CREATE LISTING
        if (request.method === 'POST') {
            if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
            
            const body = await request.json();
            const { title, description, price_kes, category, condition, location, image_urls } = body;

            if (!title || !price_kes) {
                return Response.json({ error: 'Title and Price are required' }, { status: 400, headers: corsHeaders });
            }

            const id = `list_${crypto.randomUUID().slice(0, 8)}`;
            await env.DB.prepare(`
                INSERT INTO marketplace_listings (id, seller_id, title, description, price_kes, category, condition, location, image_urls, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `).bind(id, user.id, title, description || '', price_kes, category || 'Other', condition || 'used', location || '', JSON.stringify(image_urls || [])).run();

            return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // 4. GET USER LISTINGS
        if (request.method === 'GET' && pathParts[2] === 'user') {
            const targetUserId = pathParts[3] || user?.id;
            if (!targetUserId) return new Response('Missing user ID', { status: 400, headers: corsHeaders });

            const { results } = await env.DB.prepare(`
                SELECT * FROM marketplace_listings 
                WHERE seller_id = ? 
                ORDER BY created_at DESC
            `).bind(targetUserId).all();

            return Response.json(results, { headers: corsHeaders });
        }

        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    } catch (e) {
        console.error('[MarketplaceAPI]', e.message);
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
}
