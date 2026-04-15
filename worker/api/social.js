/**
 * DJ Flowerz — Social Engine (Cloudflare Worker)
 */

import { getAuthorizedUser } from '../utils/auth.js';

export async function handleSocial(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  
  // Strip /api/social/ to get the inner routing path
  const pathPrefix = '/api/social/';
  if (!url.pathname.startsWith(pathPrefix)) {
      return json({ error: 'Not found' }, 404);
  }
  const parts = url.pathname.slice(pathPrefix.length).replace(/^\//, '').split('/');

  // Authenticate every request via Supabase JWT using our native pipeline
  const user = await getAuthorizedUser(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const actor = { id: user.id };

  try {
    // ── Feed ──────────────────────────────────────────────────────────────
    if (method === 'GET' && parts[0] === 'feed') {
      if (!parts[1])               return getFeed(url, actor, env);
      if (parts[1] === 'trending') return getTrending(url, env);
      if (parts[1] === 'profile')  return getProfile(parts[2], url, env);
    }

    // ── Posts ─────────────────────────────────────────────────────────────
    if (parts[0] === 'posts') {
      if (method === 'POST'   && parts.length === 1)              return createPost(request, actor, env);
      if (method === 'GET'    && parts.length === 2)              return getPost(parts[1], actor, env);
      if (method === 'DELETE' && parts.length === 2)              return deletePost(parts[1], actor, env);
      if (method === 'GET'    && parts[2] === 'comments')         return getComments(parts[1], url, env);
      if (method === 'POST'   && parts[2] === 'like')             return toggleLike(parts[1], actor, env);
      if (method === 'POST'   && parts[2] === 'reshare')          return reshare(parts[1], actor, env);
    }

    // ── Follows ───────────────────────────────────────────────────────────
    if (parts[0] === 'follows') {
      if (method === 'POST' && parts.length === 2)                return toggleFollow(parts[1], actor, env);
      if (method === 'GET'  && parts[2] === 'stats')              return followStats(parts[1], env);
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: err.message ?? 'Internal server error' }, err.status ?? 500);
  }
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

async function getFeed(url, actor, env) {
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const before = url.searchParams.get('before') ?? null; // cursor (created_at ISO)
  const tab    = url.searchParams.get('tab') ?? 'following'; // following | foryou

  let posts;

  if (tab === 'following') {
    // Posts from people the actor follows + their own posts
    posts = await dbAll(env, `
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
  } else {
    // "For You" — trending posts weighted by recency + engagement
    posts = await dbAll(env, `
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        -- simple score: likes×2 + reshares×3 + comments, decayed by age
        (p.like_count * 2 + p.reshare_count * 3 + p.comment_count
          - CAST((julianday('now') - julianday(p.created_at)) * 8 AS INTEGER)
        ) AS score
      FROM posts p
      JOIN user_profiles u ON u.id = p.author_id
      WHERE p.is_deleted = 0
        AND p.reply_to_id IS NULL
        AND p.created_at > datetime('now', '-7 days')
        ${before ? "AND p.created_at < ?" : ""}
      ORDER BY score DESC, p.created_at DESC
      LIMIT ?
    `, before ? [before, limit] : [limit]);
  }

  // Hydrate quoted posts inline
  posts = await hydrateQuotes(posts, env);
  // Stamp which posts the actor has liked
  posts = await stampLikes(posts, actor.id, env);

  const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null;
  return json({ posts, next_cursor: nextCursor, tab });
}

async function getTrending(url, env) {
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const posts = await dbAll(env, `
    SELECT p.*, u.username, u.display_name, u.avatar_url
    FROM posts p
    JOIN user_profiles u ON u.id = p.author_id
    WHERE p.is_deleted = 0
      AND p.reply_to_id IS NULL
      AND p.created_at > datetime('now', '-48 hours')
    ORDER BY (p.like_count * 2 + p.reshare_count * 3 + p.comment_count) DESC
    LIMIT ?
  `, [limit]);
  return json({ posts });
}

async function getProfile(userId, url, env) {
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const before = url.searchParams.get('before') ?? null;
  const posts  = await dbAll(env, `
    SELECT p.*, u.username, u.display_name, u.avatar_url
    FROM posts p
    JOIN user_profiles u ON u.id = p.author_id
    WHERE p.author_id = ? AND p.is_deleted = 0 AND p.reply_to_id IS NULL
      ${before ? "AND p.created_at < ?" : ""}
    ORDER BY p.created_at DESC LIMIT ?
  `, before ? [userId, before, limit] : [userId, limit]);
  const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null;
  return json({ posts, next_cursor: nextCursor });
}

// ─── Posts ────────────────────────────────────────────────────────────────────

async function createPost(request, actor, env) {
  const body = await request.json();
  const { content, media_urls = [], post_type = 'post', quote_of_id = null, reply_to_id = null } = body;

  // Validation
  if (post_type === 'post' || post_type === 'quoted_reshare') {
    if (!content || content.trim().length === 0) return json({ error: 'Content required' }, 400);
    if (content.length > 500) return json({ error: 'Max 500 characters' }, 400);
  }
  if ((post_type === 'reshare' || post_type === 'quoted_reshare') && !quote_of_id) {
    return json({ error: 'quote_of_id required for reshares' }, 400);
  }

  // For comments, find the thread root
  let thread_root_id = null;
  if (reply_to_id) {
    const parent = await dbGet(env, 'SELECT * FROM posts WHERE id = ?', [reply_to_id]);
    if (!parent || parent.is_deleted) return json({ error: 'Parent post not found' }, 404);
    thread_root_id = parent.thread_root_id ?? parent.id;
  }

  const id = \`post_\${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}\`;
  const ts = now();

  await dbRun(env, \`
    INSERT INTO posts
      (id, author_id, content, media_urls, post_type, quote_of_id, reply_to_id, thread_root_id, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  \`, [id, actor.id, content?.trim() ?? null, JSON.stringify(media_urls), post_type, quote_of_id, reply_to_id, thread_root_id, ts, ts]);

  // Update counters on parent / original post
  if (reply_to_id) {
    await dbRun(env, 'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [reply_to_id]);
  }
  if (quote_of_id && post_type !== 'post') {
    await dbRun(env, 'UPDATE posts SET reshare_count = reshare_count + 1 WHERE id = ?', [quote_of_id]);
  }

  // Activity event
  await logActivity(env, actor.id, post_type === 'post' ? 'post' : post_type, id, null);
  if (reply_to_id) {
    const parent = await dbGet(env, 'SELECT author_id FROM posts WHERE id = ?', [reply_to_id]);
    if (parent && parent.author_id !== actor.id) {
      await logActivity(env, actor.id, 'comment', id, parent.author_id);
    }
  }

  const post = await dbGet(env, 'SELECT * FROM posts WHERE id = ?', [id]);
  return json({ success: true, post }, 201);
}

async function getPost(id, actor, env) {
  const post = await dbGet(env, \`
    SELECT p.*, u.username, u.display_name, u.avatar_url
    FROM posts p JOIN user_profiles u ON u.id = p.author_id
    WHERE p.id = ? AND p.is_deleted = 0
  \`, [id]);
  if (!post) return json({ error: 'Post not found' }, 404);

  let quoted = null;
  if (post.quote_of_id) {
    quoted = await dbGet(env, \`
      SELECT p.*, u.username, u.display_name, u.avatar_url
      FROM posts p JOIN user_profiles u ON u.id = p.author_id
      WHERE p.id = ?
    \`, [post.quote_of_id]);
  }

  const liked = actor ? await dbGet(env, 'SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?', [id, actor.id]) : null;
  return json({ post: { ...post, viewer_liked: !!liked }, quoted_post: quoted });
}

async function getComments(postId, url, env) {
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 30), 100);
  const after  = url.searchParams.get('after') ?? null;

  // Top-level comments on this post
  const comments = await dbAll(env, \`
    SELECT p.*, u.username, u.display_name, u.avatar_url
    FROM posts p JOIN user_profiles u ON u.id = p.author_id
    WHERE p.reply_to_id = ? AND p.is_deleted = 0
      \${after ? "AND p.created_at > ?" : ""}
    ORDER BY p.created_at ASC LIMIT ?
  \`, after ? [postId, after, limit] : [postId, limit]);

  // For each top-level comment, fetch up to 3 nested replies
  const threaded = await Promise.all(comments.map(async (c) => {
    const replies = await dbAll(env, \`
      SELECT p.*, u.username, u.display_name, u.avatar_url
      FROM posts p JOIN user_profiles u ON u.id = p.author_id
      WHERE p.reply_to_id = ? AND p.is_deleted = 0
      ORDER BY p.created_at ASC LIMIT 3
    \`, [c.id]);
    return { ...c, replies };
  }));

  return json({ comments: threaded, post_id: postId });
}

async function deletePost(id, actor, env) {
  const post = await dbGet(env, 'SELECT * FROM posts WHERE id = ?', [id]);
  if (!post) return json({ error: 'Post not found' }, 404);
  if (post.author_id !== actor.id) return json({ error: 'Forbidden' }, 403);

  await dbRun(env, 'UPDATE posts SET is_deleted = 1, updated_at = ? WHERE id = ?', [now(), id]);

  // Decrement counters on parent
  if (post.reply_to_id) {
    await dbRun(env, 'UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?', [post.reply_to_id]);
  }
  if (post.quote_of_id && post.post_type !== 'post') {
    await dbRun(env, 'UPDATE posts SET reshare_count = MAX(0, reshare_count - 1) WHERE id = ?', [post.quote_of_id]);
  }

  return json({ success: true });
}

async function toggleLike(postId, actor, env) {
  const existing = await dbGet(env, 'SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?', [postId, actor.id]);

  if (existing) {
    await dbRun(env, 'DELETE FROM post_likes WHERE post_id=? AND user_id=?', [postId, actor.id]);
    await dbRun(env, 'UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?', [postId]);
    return json({ liked: false });
  } else {
    await dbRun(env, 'INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?,?,?)', [postId, actor.id, now()]);
    await dbRun(env, 'UPDATE posts SET like_count = like_count + 1 WHERE id = ?', [postId]);

    const post = await dbGet(env, 'SELECT author_id FROM posts WHERE id = ?', [postId]);
    if (post && post.author_id !== actor.id) {
      await logActivity(env, actor.id, 'like', postId, post.author_id);
    }
    return json({ liked: true });
  }
}

async function reshare(postId, actor, env) {
  // Check if already reshared (prevent duplicates)
  const existing = await dbGet(env, \`
    SELECT id FROM posts WHERE author_id=? AND quote_of_id=? AND post_type='reshare' AND is_deleted=0
  \`, [actor.id, postId]);

  if (existing) {
    // Un-reshare
    await dbRun(env, 'UPDATE posts SET is_deleted=1, updated_at=? WHERE id=?', [now(), existing.id]);
    await dbRun(env, 'UPDATE posts SET reshare_count = MAX(0, reshare_count - 1) WHERE id=?', [postId]);
    return json({ reshared: false });
  }

  const id = \`post_\${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}\`;
  const ts = now();
  await dbRun(env, \`
    INSERT INTO posts (id, author_id, content, media_urls, post_type, quote_of_id, created_at, updated_at)
    VALUES (?,?,null,'[]','reshare',?,?,?)
  \`, [id, actor.id, postId, ts, ts]);
  await dbRun(env, 'UPDATE posts SET reshare_count = reshare_count + 1 WHERE id=?', [postId]);

  const post = await dbGet(env, 'SELECT author_id FROM posts WHERE id=?', [postId]);
  if (post && post.author_id !== actor.id) {
    await logActivity(env, actor.id, 'reshare', postId, post.author_id);
  }

  return json({ reshared: true, post_id: id });
}

// ─── Follows ──────────────────────────────────────────────────────────────────

async function toggleFollow(targetId, actor, env) {
  if (targetId === actor.id) return json({ error: 'Cannot follow yourself' }, 400);

  const existing = await dbGet(env, 'SELECT 1 FROM follows WHERE follower_id=? AND following_id=?', [actor.id, targetId]);

  if (existing) {
    await dbRun(env, 'DELETE FROM follows WHERE follower_id=? AND following_id=?', [actor.id, targetId]);
    return json({ following: false });
  } else {
    await dbRun(env, 'INSERT INTO follows (follower_id, following_id, created_at) VALUES (?,?,?)', [actor.id, targetId, now()]);
    await logActivity(env, actor.id, 'follow', targetId, targetId);
    return json({ following: true });
  }
}

async function followStats(userId, env) {
  const [followers, following] = await Promise.all([
    dbGet(env, 'SELECT COUNT(*) as count FROM follows WHERE following_id=?', [userId]),
    dbGet(env, 'SELECT COUNT(*) as count FROM follows WHERE follower_id=?', [userId]),
  ]);
  return json({ followers: followers.count, following: following.count });
}

// ─── Hydration helpers ────────────────────────────────────────────────────────

async function hydrateQuotes(posts, env) {
  const quoteIds = [...new Set(posts.filter(p => p.quote_of_id).map(p => p.quote_of_id))];
  if (!quoteIds.length) return posts;

  const placeholders = quoteIds.map(() => '?').join(',');
  const quotes = await dbAll(env, \`
    SELECT p.*, u.username, u.display_name, u.avatar_url
    FROM posts p JOIN user_profiles u ON u.id = p.author_id
    WHERE p.id IN (\${placeholders})
  \`, quoteIds);

  const quoteMap = Object.fromEntries(quotes.map(q => [q.id, q]));
  return posts.map(p => ({ ...p, quoted_post: p.quote_of_id ? quoteMap[p.quote_of_id] : null }));
}

async function stampLikes(posts, userId, env) {
  if (!posts.length) return posts;
  const ids = posts.map(p => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const liked = await dbAll(env, \`SELECT post_id FROM post_likes WHERE user_id=? AND post_id IN (\${placeholders})\`, [userId, ...ids]);
  const likedSet = new Set(liked.map(l => l.post_id));
  return posts.map(p => ({ ...p, viewer_liked: likedSet.has(p.id) }));
}

// ─── Activity log ─────────────────────────────────────────────────────────────

async function logActivity(env, actorId, eventType, targetId, subjectId) {
  const id = \`evt_\${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}\`;
  await dbRun(env, \`
    INSERT INTO activity_events (id, actor_id, event_type, target_id, subject_id, created_at)
    VALUES (?,?,?,?,?,?)
  \`, [id, actorId, eventType, targetId, subjectId, now()]);
}

// ─── D1 helpers ───────────────────────────────────────────────────────────────

function now() { return new Date().toISOString(); }
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function dbRun(env, sql, params = []) { return env.DB.prepare(sql).bind(...params).run(); }
async function dbGet(env, sql, params = []) { return env.DB.prepare(sql).bind(...params).first(); }
async function dbAll(env, sql, params = []) { return (await env.DB.prepare(sql).bind(...params).all()).results; }
