// worker/api/community/profile.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleCommunityProfile(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Routes: GET /api/community/profile/:username
    //         POST /api/community/profile/update
    const lastPart = pathParts[pathParts.length - 1];
    const isUpdate = lastPart === 'update';

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // ─── SUGGESTED USERS (People You May Know) ── MUST come before profile GET ──
        if (request.method === 'GET' && url.pathname.endsWith('/suggested')) {
            const currentUserId = url.searchParams.get('userId');
            const limit = parseInt(url.searchParams.get('limit') || '6');
            let query = `
                SELECT DISTINCT user_id as id, COALESCE(full_name, 'User') as name, author_avatar as avatar_url,
                    author_role as role, MAX(created_at) as last_active,
                    (SELECT COUNT(*) FROM community_posts WHERE user_id = p.user_id) as post_count,
                    (SELECT COUNT(*) FROM community_follows WHERE following_id = p.user_id) as followers
                FROM community_posts p
                WHERE (full_name != '' AND full_name IS NOT NULL)
            `;
            const params = [];
            if (currentUserId) {
                query += ` AND user_id != ? AND user_id NOT IN (
                    SELECT following_id FROM community_follows WHERE follower_id = ?
                )`;
                params.push(currentUserId, currentUserId);
            }
            query += ` GROUP BY user_id ORDER BY last_active DESC LIMIT ?`;
            params.push(limit);
            const { results: suggested } = await env.DB.prepare(query).bind(...params).all();
            return Response.json({ suggested }, { headers: corsHeaders });
        }

        // ─── GET PROFILE ──────────────────────────────────────────────────
        if (request.method === 'GET' && !isUpdate) {
            // Slug format: 'name-slug-uuid8chars' or just a UUID/username
            let rawIdentifier = lastPart.replace('@', '');
            // Extract UUID portion if slug has format 'something-xxxxxxxx' (8 hex chars at end)
            const slugMatch = rawIdentifier.match(/^(.+)-([0-9a-f]{8})$/i);
            const identifier = slugMatch ? slugMatch[2] : rawIdentifier;
            // We try full identifier first (handles pure UUID and pure username)
            // and also the slug suffix as a partial ID match


            // 1. Try D1 profiles table
            let userProfile = null;
            try {
                const isPartial = identifier.length === 8 && /^[0-9a-f]+$/i.test(identifier);
                userProfile = await env.DB.prepare(`
                    SELECT 
                        id,
                        COALESCE(full_name, 'User') as name,
                        COALESCE(username, '') as username,
                        COALESCE(bio, '') as bio,
                        COALESCE(avatar_url, '') as avatar_url,
                        COALESCE(location, '') as location,
                        COALESCE(role, 'user') as role,
                        created_at
                    FROM profiles
                    WHERE (username != '' AND LOWER(username) = LOWER(?)) 
                       OR id = ? 
                       OR (id LIKE ? AND ${isPartial ? 1 : 0} = 1)
                    LIMIT 1
                `).bind(rawIdentifier, rawIdentifier, `${identifier}%`).first();
            } catch (e) {
                console.error('[ProfileLookup]', e.message);
            }

            // 2. Fallback: build a synthetic profile from community_posts author metadata
            if (!userProfile) {
                const isPartial = identifier.length === 8 && /^[0-9a-f]+$/i.test(identifier);
                const latestPost = await env.DB.prepare(`
                    SELECT user_id, author_name, author_avatar, author_role, created_at
                    FROM community_posts
                    WHERE user_id = ? OR (user_id LIKE ? AND ${isPartial ? 1 : 0} = 1)
                    ORDER BY created_at ASC LIMIT 1
                `).bind(identifier, `${identifier}%`).first();


                if (latestPost) {
                    userProfile = {
                        id: latestPost.user_id,
                        name: latestPost.author_name || 'Community Member',
                        username: '',
                        bio: '',
                        avatar_url: latestPost.author_avatar || '',
                        location: '',
                        role: latestPost.author_role || 'user',
                        created_at: latestPost.created_at
                    };
                }
            }

            if (!userProfile) {
                return new Response(JSON.stringify({ error: 'User not found' }), {
                    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // 3. Stats
            const [followerCount, followingCount, postCount] = await Promise.all([
                env.DB.prepare(`SELECT COUNT(*) as count FROM community_follows WHERE following_id = ?`).bind(userProfile.id).first(),
                env.DB.prepare(`SELECT COUNT(*) as count FROM community_follows WHERE follower_id = ?`).bind(userProfile.id).first(),
                env.DB.prepare(`SELECT COUNT(*) as count FROM community_posts WHERE user_id = ?`).bind(userProfile.id).first(),
            ]);

            // 4. Posts
            const { results: posts } = await env.DB.prepare(`
                SELECT p.*,
                    (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                    (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                FROM community_posts p
                WHERE p.user_id = ?
                ORDER BY p.created_at DESC
                LIMIT 50
            `).bind(userProfile.id).all();

            return Response.json({
                profile: userProfile,
                stats: {
                    followers: followerCount?.count || 0,
                    following: followingCount?.count || 0,
                    posts: postCount?.count || 0,
                },
                posts
            }, { headers: corsHeaders });
        }


        // ─── UPDATE PROFILE ───────────────────────────────────────────────
        if (request.method === 'POST') {
            const user = await getAuthorizedUser(request, env);
            if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

            const body = await request.json();
            const { username: newUsername, bio, location, avatar_url } = body;

            if (newUsername) {
                const existing = await env.DB.prepare(`SELECT id FROM profiles WHERE username = ? AND id != ?`)
                    .bind(newUsername, user.id).first();
                if (existing) return Response.json({ error: 'Username already taken' }, { status: 400, headers: corsHeaders });
            }

            // Try update, ignore if columns don't exist
            try {
                await env.DB.prepare(`
                    UPDATE profiles
                    SET username = COALESCE(?, username),
                        bio = COALESCE(?, bio),
                        location = COALESCE(?, location),
                        avatar_url = COALESCE(?, avatar_url),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).bind(newUsername || null, bio || null, location || null, avatar_url || null, user.id).run();
            } catch (e) {
                console.error('[ProfileUpdate]', e.message);
            }

            return Response.json({ success: true }, { headers: corsHeaders });
        }

        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    } catch (e) {
        console.error('[ProfileAPI]', e.message);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
