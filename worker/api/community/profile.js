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
            const authUser = await getAuthorizedUser(request, env);
            let rawIdentifier = lastPart.replace('@', '');
            const slugMatch = rawIdentifier.match(/^(.+)-([0-9a-f]{8})$/i);
            const identifier = slugMatch ? slugMatch[2] : rawIdentifier;

            // 1. Fetch entire user profile with reputation metrics
            let userProfile = null;
            try {
                const isPartial = identifier.length === 8 && /^[0-9a-f]+$/i.test(identifier);
                userProfile = await env.DB.prepare(`
                    SELECT 
                        id, email,
                        COALESCE(full_name, 'User') as name,
                        COALESCE(username, '') as username,
                        COALESCE(bio, '') as bio,
                        COALESCE(avatar_url, '') as avatar_url,
                        COALESCE(location, '') as location,
                        COALESCE(role, 'user') as role,
                        COALESCE(seller_tier, 'bronze') as seller_tier,
                        COALESCE(success_deals, 0) as success_deals,
                        COALESCE(total_deals, 0) as total_deals,
                        COALESCE(avg_rating, 0) as avg_rating,
                        COALESCE(total_reviews, 0) as total_reviews,
                        COALESCE(wallet_balance_kes, 0) as wallet_balance_kes,
                        COALESCE(m_pesa_number, '') as m_pesa_number,
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

            if (!userProfile) {
                return new Response(JSON.stringify({ error: 'User not found' }), {
                    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const isOwner = authUser && authUser.id === userProfile.id;
            const isPrivate = userProfile.is_profile_private === 1;

            // 2. Data Masking for non-owners
            const publicProfile = { ...userProfile };
            if (!isOwner) {
                delete publicProfile.email;
                delete publicProfile.wallet_balance_kes;
                delete publicProfile.m_pesa_number;
                delete publicProfile.is_shadow_flagged;
                if (isPrivate) {
                    delete publicProfile.location;
                    delete publicProfile.success_deals;
                    delete publicProfile.total_deals;
                    publicProfile.bio = "[This profile is private]";
                }
            }

            // 3. Stats & Social Graph
            const [followerCount, followingCount, postCount] = await Promise.all([
                env.DB.prepare(`SELECT COUNT(*) as count FROM community_follows WHERE following_id = ?`).bind(userProfile.id).first(),
                env.DB.prepare(`SELECT COUNT(*) as count FROM community_follows WHERE follower_id = ?`).bind(userProfile.id).first(),
                env.DB.prepare(`SELECT COUNT(*) as count FROM community_posts WHERE user_id = ?`).bind(userProfile.id).first(),
            ]);

            // 4. Content (Social Posts + Marketplace Listings)
            let posts = [];
            let listings = [];

            if (!isPrivate || isOwner) {
                const results = await Promise.all([
                    env.DB.prepare(`
                        SELECT p.*,
                            (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
                            (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count
                        FROM community_posts p
                        WHERE p.user_id = ?
                        ORDER BY p.created_at DESC LIMIT 30
                    `).bind(userProfile.id).all(),
                    env.DB.prepare(`
                        SELECT * FROM marketplace_listings 
                        WHERE seller_id = ? AND status = 'active'
                        ORDER BY created_at DESC LIMIT 20
                    `).bind(userProfile.id).all()
                ]);
                posts = results[0].results;
                listings = results[1].results;
            }

            return Response.json({
                profile: publicProfile,
                is_owner: isOwner,
                is_private: isPrivate,
                stats: {
                    followers: followerCount?.count || 0,
                    following: followingCount?.count || 0,
                    posts: (isPrivate && !isOwner) ? 0 : (postCount?.count || 0),
                    success_rate: (isPrivate && !isOwner) ? null : (userProfile.total_deals > 0 
                        ? Math.round((userProfile.success_deals / userProfile.total_deals) * 100) 
                        : 100)
                },
                posts: posts || [],
                listings: listings || []
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
