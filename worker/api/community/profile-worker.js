/**
 * DJ Flowerz — User Profile Worker (Cloudflare Worker)
 *
 * Routes:
 *  GET  /profiles/:username          → public profile + stats
 *  GET  /profiles/:username/posts    → paginated post history
 *  GET  /profiles/:username/likes    → posts user has liked
 *  PATCH /profiles/me                → update own profile
 *  GET  /profiles/me/feed            → own activity feed
 *  POST /profiles/:username/follow   → follow / unfollow toggle
 *  GET  /profiles/:username/followers → follower list
 *  GET  /profiles/:username/following → following list
 *  GET  /profiles/search?q=          → search users
 */

import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleProfiles(request, env) {
  const url    = new URL(request.url);
  const method = request.method;
  
  // Clean up the URL prefix (e.g. /api/profiles/djflowerz → ['api','profiles','djflowerz'])
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  // parts[0] = 'api', parts[1] = 'profiles'
  
  // Ensure we're in the right namespace just in case
  if (parts[1] !== 'profiles') return json({ error: 'Not found' }, 404);

  const actor  = await getAuthorizedUser(request, env);

  const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Actor-Id',
  };

  if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
  }

  try {
    // Search
    if (method === 'GET' && parts[2] === 'search') return searchUsers(url, actor, env, corsHeaders);

    // Own profile actions
    if (method === 'PATCH' && parts[2] === 'me') return updateProfile(request, actor, env, corsHeaders);
    if (method === 'GET'   && parts[2] === 'me' && parts[3] === 'feed') return getMyFeed(url, actor, env, corsHeaders);

    // Public profile routes
    const username = parts[2];
    if (!username || username === 'me') return json({ error: 'Username required' }, 400, corsHeaders);

    if (method === 'GET'  && !parts[3])                   return getProfile(username, actor, env, corsHeaders);
    if (method === 'GET'  && parts[3] === 'posts')         return getProfilePosts(username, url, actor, env, corsHeaders);
    if (method === 'GET'  && parts[3] === 'likes')         return getProfileLikes(username, url, actor, env, corsHeaders);
    if (method === 'POST' && parts[3] === 'follow')        return toggleFollow(username, actor, env, corsHeaders);
    if (method === 'GET'  && parts[3] === 'followers')     return getFollowers(username, url, env, corsHeaders);
    if (method === 'GET'  && parts[3] === 'following')     return getFollowing(username, url, env, corsHeaders);

    return json({ error: 'Not found' }, 404, corsHeaders);
  } catch (err) {
    console.error(err);
    return json({ error: err.message ?? 'Internal error' }, err.status ?? 500, corsHeaders);
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function getProfile(username, actor, env, corsHeaders) {
  // Strip @ if present
  username = username.replace(/^@/, '');
  
  const profile = await dbGet(env, `
    SELECT * FROM user_profiles WHERE username = ? AND is_deleted = 0
  `, [username]);
  if (!profile) return json({ error: 'User not found' }, 404, corsHeaders);

  // Social stats
  const [followers, following, postCount, likeCount] = await Promise.all([
    dbGet(env, 'SELECT COUNT(*) as c FROM follows WHERE following_id = ?', [profile.id]),
    dbGet(env, 'SELECT COUNT(*) as c FROM follows WHERE follower_id = ?', [profile.id]),
    dbGet(env, 'SELECT COUNT(*) as c FROM posts WHERE author_id = ? AND is_deleted = 0 AND reply_to_id IS NULL', [profile.id]),
    dbGet(env, 'SELECT COALESCE(SUM(like_count),0) as c FROM posts WHERE author_id = ? AND is_deleted = 0', [profile.id]),
  ]);

  // Aura tier (from aura_balances - handle if table doesn't exist)
  let aura = null;
  try {
    aura = await dbGet(env, 'SELECT tier, balance FROM aura_balances WHERE user_id = ?', [profile.id]);
  } catch (e) {
    // If aura_balances doesn't exist yet, just ignore
  }

  // Is the viewer following this profile?
  let viewer_following = false;
  let viewer_is_owner  = false;
  if (actor) {
    viewer_is_owner = actor.id === profile.id;
    if (!viewer_is_owner) {
      const f = await dbGet(env, 'SELECT 1 FROM follows WHERE follower_id=? AND following_id=?', [actor.id, profile.id]);
      viewer_following = !!f;
    }
  }

  return json({
    profile: {
      id:           profile.id,
      username:     profile.username,
      display_name: profile.display_name,
      bio:          profile.bio,
      avatar_url:   profile.avatar_url,
      banner_url:   profile.banner_url,
      location:     profile.location,
      website:      profile.website,
      joined_at:    profile.created_at,
      is_verified:  profile.is_verified,
      aura_tier:    aura?.tier ?? 'SPARK',
      aura_balance: aura?.balance ?? 0,
    },
    stats: {
      followers:  followers?.c ?? 0,
      following:  following?.c ?? 0,
      posts:      postCount?.c ?? 0,
      total_likes: likeCount?.c ?? 0,
    },
    viewer: { following: viewer_following, is_owner: viewer_is_owner },
  }, 200, corsHeaders);
}

async function getProfilePosts(username, url, actor, env, corsHeaders) {
  username = username.replace(/^@/, '');
  const profile = await requireProfile(username, env);
  const limit   = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const before  = url.searchParams.get('before') ?? null;
  const type    = url.searchParams.get('type') ?? 'posts'; // posts | replies | media

  let whereExtra = "AND p.reply_to_id IS NULL";
  if (type === 'replies') whereExtra = "AND p.reply_to_id IS NOT NULL";
  if (type === 'media')   whereExtra = "AND p.reply_to_id IS NULL AND p.media_urls != '[]' AND p.media_urls IS NOT NULL AND p.media_urls != ''";

  const posts = await dbAll(env, `
    SELECT p.*,
           u.username, u.display_name, u.avatar_url
    FROM posts p
    JOIN user_profiles u ON u.id = p.author_id
    WHERE p.author_id = ? AND p.is_deleted = 0
      ${whereExtra}
      ${before ? "AND p.created_at < ?" : ""}
    ORDER BY p.created_at DESC
    LIMIT ?
  `, before ? [profile.id, before, limit] : [profile.id, limit]);

  // Hydrate quoted posts
  const hydratedPosts = await hydrateQuotes(posts, env);

  // Stamp viewer likes
  const stamped = actor ? await stampLikes(hydratedPosts, actor.id, env) : hydratedPosts;

  return json({
    posts: stamped,
    next_cursor: posts.length === limit ? posts[posts.length - 1].created_at : null,
  }, 200, corsHeaders);
}

async function getProfileLikes(username, url, actor, env, corsHeaders) {
  username = username.replace(/^@/, '');
  const profile = await requireProfile(username, env);
  const limit   = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const before  = url.searchParams.get('before') ?? null;

  const posts = await dbAll(env, `
    SELECT p.*, u.username, u.display_name, u.avatar_url,
           pl.created_at as liked_at
    FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id
    JOIN user_profiles u ON u.id = p.author_id
    WHERE pl.user_id = ? AND p.is_deleted = 0
      ${before ? "AND pl.created_at < ?" : ""}
    ORDER BY pl.created_at DESC
    LIMIT ?
  `, before ? [profile.id, before, limit] : [profile.id, limit]);

  return json({
    posts,
    next_cursor: posts.length === limit ? posts[posts.length - 1].liked_at : null,
  }, 200, corsHeaders);
}

async function updateProfile(request, actor, env, corsHeaders) {
  if (!actor) return json({ error: 'Unauthorized' }, 401, corsHeaders);

  const body = await request.json();
  const allowed = ['display_name', 'bio', 'avatar_url', 'banner_url', 'location', 'website'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (updates.display_name && updates.display_name.length > 50)
    return json({ error: 'Display name max 50 chars' }, 400, corsHeaders);
  if (updates.bio && updates.bio.length > 160)
    return json({ error: 'Bio max 160 chars' }, 400, corsHeaders);
  if (updates.website && !/^https?:\/\//.test(updates.website))
    return json({ error: 'Website must start with http:// or https://' }, 400, corsHeaders);

  if (!Object.keys(updates).length) return json({ error: 'Nothing to update' }, 400, corsHeaders);

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values     = [...Object.values(updates), now(), actor.id];

  await dbRun(env, `
    UPDATE user_profiles SET ${setClauses}, updated_at = ? WHERE id = ?
  `, values);

  const updated = await dbGet(env, 'SELECT * FROM user_profiles WHERE id = ?', [actor.id]);

  // Award profile_complete points if all key fields now filled
  const complete = updated.display_name && updated.bio && updated.avatar_url && updated.location;
  if (complete) {
    try {
        // Fire-and-forget to Aura worker
        if (env.AURA) {
            env.AURA.fetch(new Request(`${env.AURA_URL}/aura/earn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': env.INTERNAL_SECRET },
            body: JSON.stringify({ user_id: actor.id, source_type: 'profile_complete', source_id: `profile_complete_${actor.id}` }),
            })).catch(() => {});
        }
    } catch(e){}
  }

  return json({ success: true, profile: updated }, 200, corsHeaders);
}

async function getMyFeed(url, actor, env, corsHeaders) {
  if (!actor) return json({ error: 'Unauthorized' }, 401, corsHeaders);
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const before = url.searchParams.get('before') ?? null;

  // Activity: own posts + posts from followed users
  const posts = await dbAll(env, `
    SELECT p.*, u.username, u.display_name, u.avatar_url
    FROM posts p
    JOIN user_profiles u ON u.id = p.author_id
    WHERE p.is_deleted = 0
      AND p.reply_to_id IS NULL
      AND (
        p.author_id = ?
        OR p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
      )
      ${before ? "AND p.created_at < ?" : ""}
    ORDER BY p.created_at DESC
    LIMIT ?
  `, before ? [actor.id, actor.id, before, limit] : [actor.id, actor.id, limit]);

  const stamped = await stampLikes(await hydrateQuotes(posts, env), actor.id, env);
  return json({ posts: stamped, next_cursor: posts.length === limit ? posts[posts.length - 1].created_at : null }, 200, corsHeaders);
}

async function toggleFollow(username, actor, env, corsHeaders) {
  if (!actor) return json({ error: 'Unauthorized' }, 401, corsHeaders);
  username = username.replace(/^@/, '');
  const target = await requireProfile(username, env);

  if (target.id === actor.id) return json({ error: 'Cannot follow yourself' }, 400, corsHeaders);

  const existing = await dbGet(env, 'SELECT 1 FROM follows WHERE follower_id=? AND following_id=?', [actor.id, target.id]);

  if (existing) {
    await dbRun(env, 'DELETE FROM follows WHERE follower_id=? AND following_id=?', [actor.id, target.id]);
    const stats = await followerStats(target.id, actor.id, env);
    return json({ following: false, ...stats }, 200, corsHeaders);
  } else {
    await dbRun(env, 'INSERT INTO follows (follower_id, following_id, created_at) VALUES (?,?,?)', [actor.id, target.id, now()]);

    try {
        // Award Aura for referral-like social action (existing user follow)
        if (env.AURA) {
            env.AURA.fetch(new Request(`${env.AURA_URL}/aura/earn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': env.INTERNAL_SECRET },
            body: JSON.stringify({ user_id: actor.id, source_type: 'follow', source_id: `follow_${actor.id}_${target.id}` }),
            })).catch(() => {});
        }
    } catch(e){}

    const stats = await followerStats(target.id, actor.id, env);
    return json({ following: true, ...stats }, 200, corsHeaders);
  }
}

async function getFollowers(username, url, env, corsHeaders) {
  username = username.replace(/^@/, '');
  const profile = await requireProfile(username, env);
  const limit   = Math.min(Number(url.searchParams.get('limit') ?? 30), 100);
  const before  = url.searchParams.get('before') ?? null;

  const rows = await dbAll(env, `
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at as followed_at
    FROM follows f
    JOIN user_profiles u ON u.id = f.follower_id
    WHERE f.following_id = ?
      ${before ? "AND f.created_at < ?" : ""}
    ORDER BY f.created_at DESC LIMIT ?
  `, before ? [profile.id, before, limit] : [profile.id, limit]);

  return json({ users: rows, next_cursor: rows.length === limit ? rows[rows.length - 1].followed_at : null }, 200, corsHeaders);
}

async function getFollowing(username, url, env, corsHeaders) {
  username = username.replace(/^@/, '');
  const profile = await requireProfile(username, env);
  const limit   = Math.min(Number(url.searchParams.get('limit') ?? 30), 100);
  const before  = url.searchParams.get('before') ?? null;

  const rows = await dbAll(env, `
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at as followed_at
    FROM follows f
    JOIN user_profiles u ON u.id = f.following_id
    WHERE f.follower_id = ?
      ${before ? "AND f.created_at < ?" : ""}
    ORDER BY f.created_at DESC LIMIT ?
  `, before ? [profile.id, before, limit] : [profile.id, limit]);

  return json({ users: rows, next_cursor: rows.length === limit ? rows[rows.length - 1].followed_at : null }, 200, corsHeaders);
}

async function searchUsers(url, actor, env, corsHeaders) {
  const q     = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 10), 20);
  if (q.length < 2) return json({ users: [] }, 200, corsHeaders);

  const term = `%${q}%`;
  const rows = await dbAll(env, `
    SELECT id, username, display_name, avatar_url, bio, is_verified
    FROM user_profiles
    WHERE is_deleted = 0
      AND (username LIKE ? OR display_name LIKE ?)
    ORDER BY
      CASE WHEN username = ? THEN 0
           WHEN username LIKE ? THEN 1
           ELSE 2 END,
      username ASC
    LIMIT ?
  `, [term, term, q, `${q}%`, limit]);

  return json({ users: rows }, 200, corsHeaders);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireProfile(username, env) {
  const p = await dbGet(env, 'SELECT * FROM user_profiles WHERE username = ? AND is_deleted = 0', [username]);
  if (!p) throw Object.assign(new Error('User not found'), { status: 404 });
  return p;
}

async function followerStats(userId, viewerId, env) {
  const [followers, following] = await Promise.all([
    dbGet(env, 'SELECT COUNT(*) as c FROM follows WHERE following_id=?', [userId]),
    dbGet(env, 'SELECT COUNT(*) as c FROM follows WHERE follower_id=?', [userId]),
  ]);
  return { followers_count: followers.c, following_count: following.c };
}

async function hydrateQuotes(posts, env) {
  const ids = [...new Set(posts.filter(p => p.quote_of_id).map(p => p.quote_of_id))];
  if (!ids.length) return posts;
  const ph   = ids.map(() => '?').join(',');
  const qs   = await dbAll(env, `SELECT p.*, u.username, u.display_name, u.avatar_url FROM posts p JOIN user_profiles u ON u.id=p.author_id WHERE p.id IN (${ph})`, ids);
  const map  = Object.fromEntries(qs.map(q => [q.id, q]));
  return posts.map(p => ({ ...p, quoted_post: p.quote_of_id ? map[p.quote_of_id] : null }));
}

async function stampLikes(posts, userId, env) {
  if (!posts.length) return posts;
  const ids  = posts.map(p => p.id);
  const ph   = ids.map(() => '?').join(',');
  const liked = await dbAll(env, `SELECT post_id FROM post_likes WHERE user_id=? AND post_id IN (${ph})`, [userId, ...ids]);
  const set  = new Set(liked.map(l => l.post_id));
  return posts.map(p => ({ ...p, viewer_liked: set.has(p.id) }));
}

function now() { return new Date().toISOString(); }
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
async function dbRun(env, sql, p = []) { return env.DB.prepare(sql).bind(...p).run(); }
async function dbGet(env, sql, p = []) { return env.DB.prepare(sql).bind(...p).first(); }
async function dbAll(env, sql, p = []) { return (await env.DB.prepare(sql).bind(...p).all()).results; }
