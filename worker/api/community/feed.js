/**
 * Community Feed API
 * Handles posts, likes, comments, follows
 * NOTE: User profiles are stored in R2/Supabase, not in D1 users table.
 * Author info is passed in from the frontend and stored with the post.
 */

export async function handleCommunityFeed(request, env) {
    const url = new URL(request.url);

    try {
        if (request.method === 'GET') {
            const feedType = url.searchParams.get('feed') || 'latest'; // latest | trending | following
            const followerId = url.searchParams.get('followerId');
            const userId = url.searchParams.get('userId'); // for "my posts"
            const cursor = url.searchParams.get('cursor'); // pagination
            const limit = 20;

            let query = '';
            let params = [];

            if (feedType === 'following' && followerId) {
                // Get posts from people the user follows
                query = `
                    SELECT p.*,
                        (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                        (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                    FROM community_posts p
                    WHERE p.user_id IN (
                        SELECT following_id FROM community_follows WHERE follower_id = ?
                    )
                    ${cursor ? 'AND p.created_at < ?' : ''}
                    ORDER BY p.created_at DESC LIMIT ?
                `;
                params = cursor ? [followerId, cursor, limit] : [followerId, limit];

            } else if (feedType === 'trending') {
                // Most liked in last 7 days
                query = `
                    SELECT p.*,
                        (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                        (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                    FROM community_posts p
                    WHERE p.created_at > datetime('now', '-7 days')
                    ORDER BY likes_count DESC, comments_count DESC LIMIT ?
                `;
                params = [limit];

            } else if (feedType === 'marketplace') {
                query = `
                    SELECT p.*,
                        (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                        (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                    FROM community_posts p
                    WHERE p.is_marketplace = 1
                    ${cursor ? 'AND p.created_at < ?' : ''}
                    ORDER BY p.created_at DESC LIMIT ?
                `;
                params = cursor ? [cursor, limit] : [limit];

            } else if (feedType === 'user' && userId) {
                query = `
                    SELECT p.*,
                        (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                        (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                    FROM community_posts p
                    WHERE p.user_id = ?
                    ${cursor ? 'AND p.created_at < ?' : ''}
                    ORDER BY p.created_at DESC LIMIT ?
                `;
                params = cursor ? [userId, cursor, limit] : [userId, limit];

            } else {
                // default: latest posts
                query = `
                    SELECT p.*,
                        (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                        (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                    FROM community_posts p
                    ${cursor ? 'WHERE p.created_at < ?' : ''}
                    ORDER BY p.created_at DESC LIMIT ?
                `;
                params = cursor ? [cursor, limit] : [limit];
            }

            const { results } = await env.DB.prepare(query).bind(...params).all();
            const nextCursor = results.length === limit ? results[results.length - 1].created_at : null;

            return new Response(JSON.stringify({ posts: results, nextCursor }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (request.method === 'POST') {
            const body = await request.json();
            const { user_id, author_name, author_avatar, author_role, content, image_url, is_marketplace, price } = body;

            if (!user_id || (!content && !image_url)) {
                return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                    status: 400, headers: { 'Content-Type': 'application/json' }
                });
            }

            const postId = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO community_posts (id, user_id, author_name, author_avatar, author_role, content, image_url, is_marketplace, price)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                postId, user_id,
                author_name || 'Anonymous', author_avatar || '', author_role || 'user',
                content || '', image_url || null,
                is_marketplace ? 1 : 0, price || 0
            ).run();

            // Return the newly created post
            const post = await env.DB.prepare(
                `SELECT *, 0 as likes_count, 0 as comments_count FROM community_posts WHERE id = ?`
            ).bind(postId).first();

            return new Response(JSON.stringify({ success: true, post }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (request.method === 'DELETE') {
            const postId = url.searchParams.get('id');
            const userId = url.searchParams.get('userId');
            if (!postId || !userId) return new Response(JSON.stringify({ error: 'Missing id or userId' }), { status: 400 });
            await env.DB.prepare(`DELETE FROM community_posts WHERE id = ? AND user_id = ?`).bind(postId, userId).run();
            return new Response(JSON.stringify({ success: true }));
        }

        return new Response('Method Not Allowed', { status: 405 });
    } catch (e) {
        console.error('[CommunityFeed]', e.message);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleCommunityInteraction(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    try {
        // ========= LIKES =========
        if (action === 'likes') {
            if (request.method === 'POST') {
                const { post_id, user_id } = await request.json();
                const existing = await env.DB.prepare(
                    `SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?`
                ).bind(post_id, user_id).first();

                if (existing) {
                    await env.DB.prepare(`DELETE FROM community_likes WHERE id = ?`).bind(existing.id).run();
                    const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_likes WHERE post_id = ?`).bind(post_id).first();
                    return new Response(JSON.stringify({ liked: false, count: count.c }));
                } else {
                    await env.DB.prepare(
                        `INSERT INTO community_likes (id, post_id, user_id) VALUES (?, ?, ?)`
                    ).bind(crypto.randomUUID(), post_id, user_id).run();
                    const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_likes WHERE post_id = ?`).bind(post_id).first();
                    return new Response(JSON.stringify({ liked: true, count: count.c }));
                }
            }
            // GET - check if user liked a post
            if (request.method === 'GET') {
                const postId = url.searchParams.get('postId');
                const userId = url.searchParams.get('userId');
                const existing = await env.DB.prepare(
                    `SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?`
                ).bind(postId, userId).first();
                return new Response(JSON.stringify({ liked: !!existing }));
            }
        }

        // ========= COMMENTS =========
        if (action === 'comments') {
            if (request.method === 'GET') {
                const postId = url.searchParams.get('postId');
                const { results } = await env.DB.prepare(
                    `SELECT * FROM community_comments WHERE post_id = ? ORDER BY created_at ASC LIMIT 50`
                ).bind(postId).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (request.method === 'POST') {
                const { post_id, user_id, author_name, author_avatar, content } = await request.json();
                if (!post_id || !user_id || !content?.trim()) {
                    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
                }
                const id = crypto.randomUUID();
                await env.DB.prepare(
                    `INSERT INTO community_comments (id, post_id, user_id, author_name, author_avatar, content) VALUES (?, ?, ?, ?, ?, ?)`
                ).bind(id, post_id, user_id, author_name || 'Anonymous', author_avatar || '', content).run();

                const comment = await env.DB.prepare(`SELECT * FROM community_comments WHERE id = ?`).bind(id).first();
                return new Response(JSON.stringify({ success: true, comment }));
            }
            if (request.method === 'DELETE') {
                const commentId = url.searchParams.get('id');
                const userId = url.searchParams.get('userId');
                await env.DB.prepare(`DELETE FROM community_comments WHERE id = ? AND user_id = ?`).bind(commentId, userId).run();
                return new Response(JSON.stringify({ success: true }));
            }
        }

        // ========= FOLLOWS =========
        if (action === 'follows') {
            if (request.method === 'POST') {
                const { follower_id, following_id, following_name, following_avatar } = await request.json();
                if (follower_id === following_id) {
                    return new Response(JSON.stringify({ error: 'Cannot follow yourself' }), { status: 400 });
                }
                const existing = await env.DB.prepare(
                    `SELECT id FROM community_follows WHERE follower_id = ? AND following_id = ?`
                ).bind(follower_id, following_id).first();

                if (existing) {
                    await env.DB.prepare(`DELETE FROM community_follows WHERE id = ?`).bind(existing.id).run();
                    return new Response(JSON.stringify({ followed: false }));
                } else {
                    await env.DB.prepare(
                        `INSERT INTO community_follows (id, follower_id, following_id, following_name, following_avatar) VALUES (?, ?, ?, ?, ?)`
                    ).bind(crypto.randomUUID(), follower_id, following_id, following_name || '', following_avatar || '').run();
                    return new Response(JSON.stringify({ followed: true }));
                }
            }
            if (request.method === 'GET') {
                const followerId = url.searchParams.get('followerId');
                const followingId = url.searchParams.get('followingId');

                if (followerId && followingId) {
                    // Check single relationship
                    const existing = await env.DB.prepare(
                        `SELECT id FROM community_follows WHERE follower_id = ? AND following_id = ?`
                    ).bind(followerId, followingId).first();
                    return new Response(JSON.stringify({ isFollowing: !!existing }));
                } else if (followerId) {
                    // Get all people this user follows
                    const { results } = await env.DB.prepare(
                        `SELECT * FROM community_follows WHERE follower_id = ?`
                    ).bind(followerId).all();
                    return new Response(JSON.stringify(results));
                }
            }
        }

        return new Response('Not Found', { status: 404 });
    } catch (e) {
        console.error('[CommunityInteraction]', e.message);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
