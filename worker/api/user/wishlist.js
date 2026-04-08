import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleWishlist(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const user = await getAuthorizedUser(request, env);
    if (!user || !user.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        if (method === 'GET') {
            const { results } = await env.DB.prepare(`
                SELECT * FROM wishlist WHERE user_id = ? ORDER BY created_at DESC
            `).bind(user.id).all();

            return new Response(JSON.stringify(results), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (method === 'POST') {
            const { targetId, targetType } = await request.json();
            
            if (!targetId || !targetType) {
                return new Response(JSON.stringify({ error: 'Missing targetId or targetType' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }

            const id = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO wishlist (id, user_id, target_id, target_type)
                VALUES (?, ?, ?, ?)
            `).bind(id, user.id, targetId, targetType).run();

            return new Response(JSON.stringify({ success: true, id }), {
                status: 201,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (method === 'DELETE') {
            // Can be passed via query string or URL path if we wanted, but let's support query string ?targetId=XYZ
            const targetId = url.searchParams.get('targetId');
            
            if (!targetId) {
                return new Response(JSON.stringify({ error: 'Missing targetId parameter' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }

            await env.DB.prepare(`
                DELETE FROM wishlist WHERE user_id = ? AND target_id = ?
            `).bind(user.id, targetId).run();

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        return new Response('Method not allowed', { status: 405 });
    } catch (error) {
        console.error('[Wishlist API Error]:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
