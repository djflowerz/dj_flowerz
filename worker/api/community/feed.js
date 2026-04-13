export async function handleCommunityFeed(request, env) {
    const url = new URL(request.url);

    try {
        if (request.method === 'GET') {
            // Get all posts or filter by user/marketplace
            const userId = url.searchParams.get('userId');
            const isMarketplace = url.searchParams.get('isMarketplace');
            
            let query = `
                SELECT p.*, 
                       u.name as author_name, u.avatar_url as author_avatar, u.role as author_role,
                       (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                       (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                FROM community_posts p
                LEFT JOIN users u ON p.user_id = u.id
            `;
            let params = [];
            let conditions = [];

            if (userId) {
                conditions.push(`p.user_id = ?`);
                params.push(userId);
            }
            if (isMarketplace === 'true') {
                conditions.push(`p.is_marketplace = 1`);
            } else if (isMarketplace === 'false') {
                conditions.push(`p.is_marketplace = 0`);
            }

            if (conditions.length > 0) {
                query += ` WHERE ` + conditions.join(' AND ');
            }

            query += ` ORDER BY p.created_at DESC LIMIT 50`;

            const { results } = await env.DB.prepare(query).bind(...params).all();

            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (request.method === 'POST') {
            const body = await request.json();
            const { user_id, content, image_url, is_marketplace, price } = body;

            if (!user_id || (!content && !image_url)) {
                return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
            }

            const postId = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO community_posts (id, user_id, content, image_url, is_marketplace, price) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(postId, user_id, content || '', image_url || null, is_marketplace ? 1 : 0, price || 0).run();

            return new Response(JSON.stringify({ success: true, id: postId }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('Method Not Allowed', { status: 405 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function handleCommunityInteraction(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1]; // e.g. /api/community/likes or /comments

    try {
        if (action === 'likes') {
            if (request.method === 'POST') {
                const { post_id, user_id } = await request.json();
                
                // Toggle like (Insert if not exists, delete if exists)
                const existing = await env.DB.prepare(`SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?`).bind(post_id, user_id).first();
                if (existing) {
                    await env.DB.prepare(`DELETE FROM community_likes WHERE id = ?`).bind(existing.id).run();
                    return new Response(JSON.stringify({ liked: false }));
                } else {
                    await env.DB.prepare(`INSERT INTO community_likes (id, post_id, user_id) VALUES (?, ?, ?)`).bind(crypto.randomUUID(), post_id, user_id).run();
                    return new Response(JSON.stringify({ liked: true }));
                }
            }
        }

        if (action === 'comments') {
            if (request.method === 'GET') {
                const postId = url.searchParams.get('postId');
                const { results } = await env.DB.prepare(`
                    SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
                    FROM community_comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.post_id = ? ORDER BY c.created_at ASC
                `).bind(postId).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }

            if (request.method === 'POST') {
                const { post_id, user_id, content } = await request.json();
                const id = crypto.randomUUID();
                await env.DB.prepare(`INSERT INTO community_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)`).bind(id, post_id, user_id, content).run();
                return new Response(JSON.stringify({ success: true, id }));
            }
        }

        if (action === 'follows') {
            if (request.method === 'POST') {
                const { follower_id, following_id } = await request.json();
                const existing = await env.DB.prepare(`SELECT id FROM community_follows WHERE follower_id = ? AND following_id = ?`).bind(follower_id, following_id).first();
                if (existing) {
                    await env.DB.prepare(`DELETE FROM community_follows WHERE id = ?`).bind(existing.id).run();
                    return new Response(JSON.stringify({ followed: false }));
                } else {
                    await env.DB.prepare(`INSERT INTO community_follows (id, follower_id, following_id) VALUES (?, ?, ?)`).bind(crypto.randomUUID(), follower_id, following_id).run();
                    return new Response(JSON.stringify({ followed: true }));
                }
            }
            if (request.method === 'GET') {
                const followerId = url.searchParams.get('followerId');
                const followingId = url.searchParams.get('followingId');
                if (followerId && followingId) {
                    const existing = await env.DB.prepare(`SELECT id FROM community_follows WHERE follower_id = ? AND following_id = ?`).bind(followerId, followingId).first();
                    return new Response(JSON.stringify({ isFollowing: !!existing }));
                }
            }
        }

        return new Response('Not Found', { status: 404 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
