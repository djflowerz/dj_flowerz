import { Env } from './types';

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const actorId = request.headers.get('X-Actor-Id');

  // ─── CORS Preflight ──────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Actor-Id',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  const commonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: commonHeaders });

  // ─── Social Feed ─────────────────────────────────────────────────────────────

  // GET /api/social/feed
  if (path === '/api/social/feed' && method === 'GET') {
    const tab = url.searchParams.get('tab') || 'latest';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const before = url.searchParams.get('before');
    const userId = url.searchParams.get('userId') || actorId || null;

    const params: any[] = [];
    const whereClauses: string[] = ['p.parent_id IS NULL'];

    if (tab === 'marketplace') whereClauses.push(`p.is_marketplace = 1`);

    if (tab === 'following' && userId) {
      whereClauses.push(`p.author_id IN (SELECT following_id FROM community_follows WHERE follower_id = ?)`);
      params.push(userId);
    }

    if (before) {
      whereClauses.push(`p.created_at < ?`);
      params.push(before);
    }

    const where = `WHERE ${whereClauses.join(' AND ')}`;
    const orderBy = tab === 'trending'
      ? `ORDER BY (p.likes_count + p.comments_count * 2) DESC, p.created_at DESC`
      : `ORDER BY p.created_at DESC`;

    const likedExpr = userId
      ? `(SELECT COUNT(*) FROM community_likes WHERE post_id = p.id AND user_id = '${userId.replace(/'/g, "''")}') > 0`
      : `0`;

    const query = `
      SELECT p.*, ${likedExpr} as viewer_liked
      FROM community_posts p
      ${where}
      ${orderBy}
      LIMIT ?
    `;
    params.push(limit);

    try {
      const { results } = await env.DB.prepare(query).bind(...params).all();
      const nextCursor = results.length === limit ? (results[results.length - 1] as any).created_at : null;
      return json({ posts: results, next_cursor: nextCursor });
    } catch (e: any) {
      return json({ error: e.message, posts: [], next_cursor: null }, 500);
    }
  }

  // GET /api/social/feed/profile/:identifier
  const profileFeedMatch = path.match(/^\/api\/social\/feed\/profile\/([^/]+)$/);
  if (profileFeedMatch && method === 'GET') {
    let identifier = profileFeedMatch[1];
    if (identifier.startsWith('@')) identifier = identifier.substring(1);

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const before = url.searchParams.get('before');
    const userId = url.searchParams.get('userId') || actorId || null;

    // First find the user ID for this identifier
    const profile = await env.DB.prepare(
      `SELECT id FROM profiles WHERE username = ? OR id = ?`
    ).bind(identifier, identifier).first() as any;

    if (!profile) return json({ error: 'Profile not found', posts: [] }, 404);

    const params: any[] = [profile.id];
    const whereClauses: string[] = ['p.author_id = ?'];

    if (before) {
      whereClauses.push(`p.created_at < ?`);
      params.push(before);
    }

    const likedExpr = userId
      ? `(SELECT COUNT(*) FROM community_likes WHERE post_id = p.id AND user_id = '${userId.replace(/'/g, "''")}') > 0`
      : `0`;

    const query = `
      SELECT p.*, ${likedExpr} as viewer_liked
      FROM community_posts p
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    try {
      const { results } = await env.DB.prepare(query).bind(...params).all();
      const nextCursor = results.length === limit ? (results[results.length - 1] as any).created_at : null;
      return json({ posts: results, next_cursor: nextCursor });
    } catch (e: any) {
      return json({ error: e.message, posts: [] }, 500);
    }
  }

  // GET /api/social/posts/:id
  const postMatch = path.match(/^\/api\/social\/posts\/([^/]+)$/);
  if (postMatch && method === 'GET') {
    const postId = postMatch[1];
    const userId = actorId || null;

    const likedExpr = userId
      ? `(SELECT COUNT(*) FROM community_likes WHERE post_id = p.id AND user_id = '${userId.replace(/'/g, "''")}') > 0`
      : `0`;

    const post = await env.DB.prepare(`
      SELECT p.*, ${likedExpr} as viewer_liked
      FROM community_posts p
      WHERE p.id = ?
    `).bind(postId).first();

    if (!post) return json({ error: 'Post not found' }, 404);
    return json({ post });
  }

  // DELETE /api/social/posts/:id
  if (postMatch && method === 'DELETE') {
    const postId = postMatch[1];
    if (!actorId) return json({ error: 'Unauthorized' }, 401);

    const post = await env.DB.prepare(`SELECT author_id FROM community_posts WHERE id = ?`).bind(postId).first() as any;
    if (!post) return json({ error: 'Post not found' }, 404);

    // Only owner or admin can delete
    const requester = await env.DB.prepare(`SELECT role FROM profiles WHERE id = ?`).bind(actorId).first() as any;
    if (post.author_id !== actorId && requester?.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403);
    }

    await env.DB.prepare(`DELETE FROM community_posts WHERE id = ?`).bind(postId).run();
    // Clean up related data
    await env.DB.prepare(`DELETE FROM community_likes WHERE post_id = ?`).bind(postId).run();
    await env.DB.prepare(`DELETE FROM community_comments WHERE post_id = ?`).bind(postId).run();

    return json({ success: true });
  }

  // GET /api/social/posts/:id/comments
  const commentsMatch = path.match(/^\/api\/social\/posts\/([^/]+)\/comments$/);
  if (commentsMatch && method === 'GET') {
    const postId = commentsMatch[1];
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
    const { results } = await env.DB.prepare(
      `SELECT * FROM community_comments WHERE post_id = ? ORDER BY created_at ASC LIMIT ?`
    ).bind(postId, limit).all();
    return json({ comments: results });
  }

  // POST /api/social/posts
  if (path === '/api/social/posts' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);

    const body: any = await request.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const profile = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ?`).bind(actorId).first() as any;
    const authorName = body.author_name || profile?.name || profile?.display_name || 'Anonymous';
    const authorAvatar = body.author_avatar || profile?.avatar_url || '';
    const authorUsername = body.author_username || profile?.username || '';
    const authorRole = profile?.role || 'user';

    await env.DB.prepare(`
      INSERT INTO community_posts
        (id, author_id, author_name, author_avatar, author_username, author_role,
         content, image_url, is_marketplace, price, escrow_status,
         likes_count, comments_count, reshare_count, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, 0, 0, ?, ?)
    `).bind(
      id, actorId, authorName, authorAvatar, authorUsername, authorRole,
      body.content || null,
      (body.media_urls && body.media_urls[0]) || body.image_url || null,
      body.is_marketplace ? 1 : 0,
      body.price || 0,
      body.reply_to_id || null,
      now
    ).run();

    if (body.reply_to_id) {
      await env.DB.prepare(`UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?`)
        .bind(body.reply_to_id).run();
    }

    const post = await env.DB.prepare(`SELECT * FROM community_posts WHERE id = ?`).bind(id).first();
    return json({ post });
  }

  // POST /api/social/posts/:id/like (toggle)
  const likeMatch = path.match(/^\/api\/social\/posts\/([^/]+)\/like$/);
  if (likeMatch && method === 'POST') {
    const postId = likeMatch[1];
    if (!actorId) return json({ error: 'Unauthorized' }, 401);

    const existing = await env.DB.prepare(
      `SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?`
    ).bind(postId, actorId).first();

    if (existing) {
      await env.DB.prepare(`DELETE FROM community_likes WHERE post_id = ? AND user_id = ?`).bind(postId, actorId).run();
      await env.DB.prepare(`UPDATE community_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?`).bind(postId).run();
      return json({ liked: false });
    } else {
      await env.DB.prepare(
        `INSERT INTO community_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), postId, actorId, new Date().toISOString()).run();
      await env.DB.prepare(`UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?`).bind(postId).run();
      return json({ liked: true });
    }
  }

  // POST /api/social/posts/:id/reshare
  const reshareMatch = path.match(/^\/api\/social\/posts\/([^/]+)\/reshare$/);
  if (reshareMatch && method === 'POST') {
    const postId = reshareMatch[1];
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    await env.DB.prepare(`UPDATE community_posts SET reshare_count = reshare_count + 1 WHERE id = ?`).bind(postId).run();
    return json({ reshared: true });
  }

  // GET /api/social/follows/:userId/stats
  const followStatsMatch = path.match(/^\/api\/social\/follows\/([^/]+)\/stats$/);
  if (followStatsMatch && method === 'GET') {
    const targetId = followStatsMatch[1];
    const followers = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_follows WHERE following_id = ?`).bind(targetId).first() as any;
    const following = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_follows WHERE follower_id = ?`).bind(targetId).first() as any;
    return json({ followers: followers?.c || 0, following: following?.c || 0 });
  }

  // POST /api/social/follows/:userId (toggle)
  const followMatch = path.match(/^\/api\/social\/follows\/([^/]+)$/);
  if (followMatch && method === 'POST') {
    const targetId = followMatch[1];
    if (!actorId) return json({ error: 'Unauthorized' }, 401);

    const existing = await env.DB.prepare(
      `SELECT id FROM community_follows WHERE follower_id = ? AND following_id = ?`
    ).bind(actorId, targetId).first();

    if (existing) {
      await env.DB.prepare(`DELETE FROM community_follows WHERE follower_id = ? AND following_id = ?`).bind(actorId, targetId).run();
      return json({ followed: false });
    } else {
      await env.DB.prepare(
        `INSERT INTO community_follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), actorId, targetId, new Date().toISOString()).run();
      return json({ followed: true });
    }
  }

  // GET /api/community/suggested
  if (path === '/api/community/suggested' && method === 'GET') {
    const userId = url.searchParams.get('userId') || actorId;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 20);
    const params: any[] = [];
    let query = `SELECT id, name, avatar_url, role FROM profiles`;

    if (userId) {
      query += ` WHERE id != ? AND id NOT IN (SELECT following_id FROM community_follows WHERE follower_id = ?)`;
      params.push(userId, userId);
    }

    query += ` ORDER BY RANDOM() LIMIT ?`;
    params.push(limit);

    try {
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return json({ suggested: results });
    } catch {
      return json({ suggested: [] });
    }
  }

  // ─── Profile Routes ───────────────────────────────────────────────────────────

  if (path.startsWith('/api/profiles/me') && actorId) {
    if (method === 'GET') {
      const profile = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ?`).bind(actorId).first() as any;
      if (!profile) return json({ error: 'Not found' }, 404);
      
      const followers = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_follows WHERE following_id = ?`).bind(actorId).first() as any;
      const following = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_follows WHERE follower_id = ?`).bind(actorId).first() as any;
      const posts = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_posts WHERE author_id = ?`).bind(actorId).first() as any;
      const likesReceived = await env.DB.prepare(`
        SELECT COALESCE(SUM(likes_count), 0) as c FROM community_posts WHERE author_id = ?
      `).bind(actorId).first() as any;

      return json({
        profile,
        stats: {
          followers: followers?.c || 0,
          following: following?.c || 0,
          posts: posts?.c || 0,
          total_likes: likesReceived?.c || 0
        },
        viewer: {
          is_owner: true,
          following: false
        }
      });
    }

    if (method === 'PATCH') {
      const body = await request.json() as any;
      const allowed = ['display_name', 'bio', 'location', 'website', 'username', 'avatar_url', 'banner_url'];
      const sets: string[] = [];
      const params: any[] = [];
      
      for (const k of allowed) {
        if (body[k] !== undefined) {
          sets.push(`${k} = ?`);
          params.push(body[k]);
        }
      }
      
      if (sets.length > 0) {
        params.push(actorId);
        await env.DB.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
      }
      
      const profile = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ?`).bind(actorId).first();
      return json({ profile });
    }
  }

  // GET /api/profiles/:identifier
  if (path.startsWith('/api/profiles/') && method === 'GET') {
    let identifier = path.split('/').pop() || '';
    if (identifier.startsWith('@')) identifier = identifier.substring(1);

    const profile = await env.DB.prepare(
      `SELECT * FROM profiles WHERE username = ? OR id = ?`
    ).bind(identifier, identifier).first() as any;

    if (!profile) return json({ error: 'Profile not found' }, 404);

    const targetId = profile.id;
    const followers = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_follows WHERE following_id = ?`).bind(targetId).first() as any;
    const followingCount = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_follows WHERE follower_id = ?`).bind(targetId).first() as any;
    const posts = await env.DB.prepare(`SELECT COUNT(*) as c FROM community_posts WHERE author_id = ?`).bind(targetId).first() as any;
    const likesReceived = await env.DB.prepare(`
      SELECT COALESCE(SUM(likes_count), 0) as c FROM community_posts WHERE author_id = ?
    `).bind(targetId).first() as any;

    let isFollowing = false;
    if (actorId) {
      const existing = await env.DB.prepare(
        `SELECT id FROM community_follows WHERE follower_id = ? AND following_id = ?`
      ).bind(actorId, targetId).first();
      isFollowing = !!existing;
    }

    return json({
      profile,
      stats: {
        followers: followers?.c || 0,
        following: followingCount?.c || 0,
        posts: posts?.c || 0,
        total_likes: likesReceived?.c || 0
      },
      viewer: {
        is_owner: actorId === targetId,
        following: isFollowing
      }
    });
  }

  // ─── Commerce Routes ──────────────────────────────────────────────────────────

  if ((path === '/api/products' || path === '/api/v1/products') && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC`
    ).all();
    return json(results);
  }

  if (path === '/api/mixtapes' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM mixtapes ORDER BY date_added DESC`
    ).all();
    return json(results);
  }

  // ─── 404 ─────────────────────────────────────────────────────────────────────
  return json({ error: `Route ${method} ${path} not found` }, 404);
}
