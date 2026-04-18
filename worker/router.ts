import { Env } from './types';

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const actorId = request.headers.get('X-Actor-Id') || null;
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  // ─── CORS Preflight ──────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Actor-Id',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Helper to standardise all JSON responses
  const json = (data: any, statusOrInit?: number | ResponseInit) => {
    const init = typeof statusOrInit === 'number' ? { status: statusOrInit } : (statusOrInit || {});
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Actor-Id',
        'Content-Security-Policy': "script-src 'self' blob: 'unsafe-inline' https:;",
        ...(init.headers || {}),
      },
    });
  };

  // ─── SOCIAL ROUTES (social_* infrastructure) ───────────────────────────────

  // GET /api/social/feed
  if (method === 'GET' && path === '/api/social/feed') {
    const tab = url.searchParams.get('tab') || 'latest';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const before = url.searchParams.get('before');
    const userId = url.searchParams.get('userId') || actorId;

    let query = '';
    const params: any[] = [];

    const baseSelect = `
      SELECT sp.*,
        CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked
      FROM social_posts sp
      LEFT JOIN social_likes sl ON sl.post_id = sp.id AND sl.user_id = ?
    `;

    if (tab === 'following' && userId) {
      query = `${baseSelect}
        INNER JOIN social_follows sf ON sf.following_id = sp.author_id AND sf.follower_id = ?
        WHERE 1=1 ${before ? 'AND sp.created_at < ?' : ''}
        ORDER BY sp.created_at DESC LIMIT ?`;
      params.push(userId || '', userId, ...(before ? [before] : []), limit + 1);
    } else if (tab === 'trending') {
      query = `${baseSelect}
        WHERE 1=1 ${before ? 'AND sp.created_at < ?' : ''}
        ORDER BY sp.likes_count DESC, sp.comments_count DESC, sp.created_at DESC LIMIT ?`;
      params.push(userId || '', ...(before ? [before] : []), limit + 1);
    } else if (tab === 'marketplace') {
      query = `${baseSelect}
        WHERE sp.is_marketplace = 1 ${before ? 'AND sp.created_at < ?' : ''}
        ORDER BY sp.created_at DESC LIMIT ?`;
      params.push(userId || '', ...(before ? [before] : []), limit + 1);
    } else {
      // latest (default)
      query = `${baseSelect}
        WHERE 1=1 ${before ? 'AND sp.created_at < ?' : ''}
        ORDER BY sp.created_at DESC LIMIT ?`;
      params.push(userId || '', ...(before ? [before] : []), limit + 1);
    }

    try {
      const result = await env.DB.prepare(query).bind(...params).all();
      const posts = result.results || [];
      const hasMore = posts.length > limit;
      if (hasMore) posts.pop();

      return json({
        posts: posts.map((p: any) => ({
          ...p,
          viewer_liked: p.viewer_liked === 1,
          like_count: p.likes_count,
          comment_count: p.comments_count,
        })),
        next_cursor: hasMore ? (posts[posts.length - 1] as any)?.created_at : null
      });
    } catch (e: any) {
      return json({ error: e.message, posts: [] }, 500);
    }
  }

  // GET /api/social/posts/:id
  if (method === 'GET' && path.match(/^\/api\/social\/posts\/[^/]+$/)) {
    const postId = path.split('/').pop();
    const userId = actorId;
    
    const post = await env.DB.prepare(`
      SELECT sp.*, CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked
      FROM social_posts sp
      LEFT JOIN social_likes sl ON sl.post_id = sp.id AND sl.user_id = ?
      WHERE sp.id = ?
    `).bind(userId || '', postId).first() as any;

    if (!post) return json({ error: 'Not found' }, { status: 404 });

    let quoted_post = null;
    if (post.quote_of_id) {
      quoted_post = await env.DB.prepare('SELECT * FROM social_posts WHERE id = ?')
        .bind(post.quote_of_id).first();
    }

    return json({ post: { ...post, viewer_liked: post.viewer_liked === 1 }, quoted_post });
  }

  // GET /api/social/posts/:id/comments
  if (method === 'GET' && path.match(/^\/api\/social\/posts\/[^/]+\/comments$/)) {
    const postId = path.split('/')[4];
    const limit = parseInt(url.searchParams.get('limit') || '30');

    const result = await env.DB.prepare(`
      SELECT * FROM social_comments WHERE post_id = ? ORDER BY created_at ASC LIMIT ?
    `).bind(postId, limit).all();

    return json({ comments: result.results || [] });
  }

  // POST /api/social/posts
  if (method === 'POST' && path === '/api/social/posts') {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as any;
    const { content, media_urls, is_marketplace, price, post_type, reply_to_id, quote_of_id } = body;

    // Fetch author info from users table
    const author = await env.DB.prepare(
      'SELECT id, name, avatar_url, username, role FROM users WHERE id = ?'
    ).bind(actorId).first() as any;

    const id = crypto.randomUUID();
    const imageUrl = Array.isArray(media_urls) && media_urls.length > 0 ? media_urls[0] : null;

    await env.DB.prepare(`
      INSERT INTO social_posts (
        id, author_id, author_name, author_avatar, author_username, author_role,
        content, image_url, media_urls, is_marketplace, price, post_type, reply_to_id, quote_of_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      actorId,
      author?.name || 'Anonymous',
      author?.avatar_url || '',
      author?.username || '',
      author?.role || 'user',
      content || '',
      imageUrl,
      JSON.stringify(media_urls || []),
      is_marketplace ? 1 : 0,
      price || 0,
      post_type || 'post',
      reply_to_id || null,
      quote_of_id || null
    ).run();

    // If reply, increment parent comments_count
    if (reply_to_id) {
      await env.DB.prepare(
        'UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = ?'
      ).bind(reply_to_id).run();
    }

    const newPost = await env.DB.prepare('SELECT * FROM social_posts WHERE id = ?').bind(id).first();
    return json({ post: newPost });
  }

  // POST /api/social/posts/:id/like (toggle)
  if (method === 'POST' && path.match(/^\/api\/social\/posts\/[^/]+\/like$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    const postId = path.split('/')[4];

    const existing = await env.DB.prepare(
      'SELECT id FROM social_likes WHERE post_id = ? AND user_id = ?'
    ).bind(postId, actorId).first();

    if (existing) {
      await env.DB.prepare('DELETE FROM social_likes WHERE post_id = ? AND user_id = ?')
        .bind(postId, actorId).run();
      await env.DB.prepare(
        'UPDATE social_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?'
      ).bind(postId).run();
      const post = await env.DB.prepare('SELECT likes_count FROM social_posts WHERE id = ?').bind(postId).first() as any;
      return json({ liked: false, count: post?.likes_count ?? 0 });
    } else {
      await env.DB.prepare('INSERT OR IGNORE INTO social_likes (id, post_id, user_id) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), postId, actorId).run();
      await env.DB.prepare(
        'UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = ?'
      ).bind(postId).run();
      const post = await env.DB.prepare('SELECT likes_count FROM social_posts WHERE id = ?').bind(postId).first() as any;
      return json({ liked: true, count: post?.likes_count ?? 0 });
    }
  }

  // DELETE /api/social/posts/:id
  if (method === 'DELETE' && path.match(/^\/api\/social\/posts\/[^/]+$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    const postId = path.split('/').pop();

    const post = await env.DB.prepare('SELECT author_id FROM social_posts WHERE id = ?').bind(postId).first() as any;
    if (!post) return json({ error: 'Not found' }, { status: 404 });

    const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(actorId).first() as any;
    if (post.author_id !== actorId && user?.role !== 'admin') {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    await env.DB.prepare('DELETE FROM social_posts WHERE id = ?').bind(postId).run();
    return json({ success: true });
  }

  // POST /api/social/posts/:id/reshare
  if (method === 'POST' && path.match(/^\/api\/social\/posts\/[^/]+\/reshare$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    const postId = path.split('/')[4];

    const author = await env.DB.prepare(
      'SELECT id, name, avatar_url, username, role FROM users WHERE id = ?'
    ).bind(actorId).first() as any;

    try {
      await env.DB.prepare('INSERT INTO social_reshares (id, post_id, user_id) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), postId, actorId).run();
      await env.DB.prepare(
        'UPDATE social_posts SET reshare_count = reshare_count + 1 WHERE id = ?'
      ).bind(postId).run();
      
      // Create reshare post
      await env.DB.prepare(`
        INSERT INTO social_posts (id, author_id, author_name, author_avatar, author_username, author_role, content, post_type, quote_of_id)
        VALUES (?, ?, ?, ?, ?, ?, '', 'reshare', ?)
      `).bind(
        crypto.randomUUID(), actorId,
        author?.name || '', author?.avatar_url || '',
        author?.username || '', author?.role || 'user', postId
      ).run();

      return json({ success: true, reshared: true });
    } catch {
      return json({ success: true, reshared: false }); // already reshared
    }
  }

  // POST /api/social/follows/:userId (toggle)
  if (method === 'POST' && path.match(/^\/api\/social\/follows\/[^/]+$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    const targetId = path.split('/').pop();
    if (targetId === actorId) return json({ error: 'Cannot follow yourself' }, { status: 400 });

    const existing = await env.DB.prepare(
      'SELECT id FROM social_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(actorId, targetId).first();

    if (existing) {
      await env.DB.prepare('DELETE FROM social_follows WHERE follower_id = ? AND following_id = ?')
        .bind(actorId, targetId).run();
      return json({ followed: false });
    } else {
      await env.DB.prepare('INSERT OR IGNORE INTO social_follows (id, follower_id, following_id) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), actorId, targetId).run();
      return json({ followed: true });
    }
  }

  // GET /api/social/follows/:userId/stats
  if (method === 'GET' && path.match(/^\/api\/social\/follows\/[^/]+\/stats$/)) {
    const targetId = path.split('/')[4];

    const followersResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM social_follows WHERE following_id = ?'
    ).bind(targetId).first() as any;

    const followingResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM social_follows WHERE follower_id = ?'
    ).bind(targetId).first() as any;

    const isFollowing = actorId ? await env.DB.prepare(
      'SELECT 1 FROM social_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(actorId, targetId).first() : null;

    return json({
      followers: followersResult?.count ?? 0,
      following: followingResult?.count ?? 0,
      is_following: !!isFollowing
    });
  }

  // GET /api/social/profile/:username
  if (method === 'GET' && path.match(/^\/api\/social\/profile\/[^/]+$/)) {
    const username = path.split('/').pop()?.replace('@', '');

    const profile = await env.DB.prepare(`
      SELECT id, name, avatar_url, username, role, bio, cover_url,
        location, website, dj_genre, dj_since, pinned_post_id,
        instagram, soundcloud, mixcloud, is_verified, created_at,
        (SELECT COUNT(*) FROM social_posts 
          WHERE author_id = users.id AND post_type != 'reshare') as post_count,
        (SELECT COUNT(*) FROM social_follows 
          WHERE following_id = users.id) as followers_count,
        (SELECT COUNT(*) FROM social_follows 
          WHERE follower_id = users.id) as following_count
      FROM users WHERE username = ? OR id = ?
    `).bind(username, username).first() as any;

    if (!profile) return json({ error: 'Profile not found' }, { status: 404 });

    const isFollowing = actorId ? await env.DB.prepare(
      'SELECT 1 FROM social_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(actorId, profile.id).first() : null;

    // Fetch pinned post if set
    let pinnedPost = null;
    if (profile.pinned_post_id) {
      pinnedPost = await env.DB.prepare(
        'SELECT * FROM social_posts WHERE id = ?'
      ).bind(profile.pinned_post_id).first();
    }

    const posts = await env.DB.prepare(`
      SELECT sp.*,
        CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked
      FROM social_posts sp
      LEFT JOIN social_likes sl ON sl.post_id = sp.id AND sl.user_id = ?
      WHERE sp.author_id = ?
      ORDER BY sp.created_at DESC LIMIT 20
    `).bind(actorId || '', profile.id).all();

    return json({
      profile: { ...profile, is_following: !!isFollowing },
      pinned_post: pinnedPost,
      posts: (posts.results || []).map((p: any) => ({
        ...p,
        viewer_liked: p.viewer_liked === 1,
        like_count: p.likes_count,
        comment_count: p.comments_count,
      }))
    });
  }

  // PUT /api/social/profile
  if (method === 'PUT' && path === '/api/social/profile') {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json() as any;
    const { bio, cover_url, location, website, dj_genre, dj_since, instagram, soundcloud, mixcloud } = body;

    await env.DB.prepare(`
      UPDATE users SET
        bio = COALESCE(?, bio),
        cover_url = COALESCE(?, cover_url),
        location = COALESCE(?, location),
        website = COALESCE(?, website),
        dj_genre = COALESCE(?, dj_genre),
        dj_since = COALESCE(?, dj_since),
        instagram = COALESCE(?, instagram),
        soundcloud = COALESCE(?, soundcloud),
        mixcloud = COALESCE(?, mixcloud)
      WHERE id = ?
    `).bind(
      bio ?? null, cover_url ?? null, location ?? null,
      website ?? null, dj_genre ?? null, dj_since ?? null,
      instagram ?? null, soundcloud ?? null, mixcloud ?? null,
      actorId
    ).run();

    const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(actorId).first();
    return json({ profile: updated });
  }

  // PUT /api/social/profile/pin/:postId
  if (method === 'PUT' && path.match(/^\/api\/social\/profile\/pin\/[^/]+$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    const postId = path.split('/').pop();
    
    // Verify post belongs to user
    const post = await env.DB.prepare(
      'SELECT id FROM social_posts WHERE id = ? AND author_id = ?'
    ).bind(postId, actorId).first();
    
    if (!post) return json({ error: 'Post not found' }, { status: 404 });
    
    await env.DB.prepare('UPDATE users SET pinned_post_id = ? WHERE id = ?')
      .bind(postId, actorId).run();
    return json({ success: true });
  }

  // DELETE /api/social/profile/pin
  if (method === 'DELETE' && path === '/api/social/profile/pin') {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    await env.DB.prepare('UPDATE users SET pinned_post_id = NULL WHERE id = ?')
      .bind(actorId).run();
    return json({ success: true });
  }

  // GET /api/community/suggested
  if (method === 'GET' && path === '/api/community/suggested') {
    const userId = url.searchParams.get('userId') || actorId;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 20);

    const result = await env.DB.prepare(`
      SELECT u.id, u.name, u.avatar_url, u.username, u.role,
        (SELECT COUNT(*) FROM social_posts WHERE author_id = u.id) as post_count,
        (SELECT COUNT(*) FROM social_follows WHERE following_id = u.id) as followers
      FROM users u
      WHERE u.id != COALESCE(?, '')
      AND u.id NOT IN (
        SELECT following_id FROM social_follows WHERE follower_id = COALESCE(?, '')
      )
      GROUP BY u.id
      ORDER BY followers DESC, post_count DESC
      LIMIT ?
    `).bind(userId || '', userId || '', limit).all();

    return json({ suggested: result.results || [] });
  }

  // ─── Commerce Routes ──────────────────────────────────────────────────────────

  if ((path === '/api/products' || path === '/api/v1/products') && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM products ORDER BY created_at DESC`
    ).all();
    return json(results);
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
