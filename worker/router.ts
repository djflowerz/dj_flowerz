import { Env } from './types';

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
  const adminEmail = (env.VITE_ADMIN_EMAIL || '').toLowerCase(); // Strictly use ENV

  // ─── Resolve the real D1 user ID from JWT (fixes Anonymous posts & profile pics)
  let _actorId = request.headers.get('X-Actor-Id') || null;
  let _jwtEmail = '';
  if (token) {
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      _jwtEmail = (payload.email || '').toLowerCase();
      if (!_actorId) _actorId = payload.sub || null;
    } catch(e) {}
  }
  // Map Ian's Supabase UUID → the real D1 profile row at all times
  const actorId = _jwtEmail === adminEmail ? 'user_djflowerz' : _actorId;

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
  
  // Helper to normalize legacy R2 URLs to proxy paths
  const normalizeAssetUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    const legacyDomain = 'pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev';
    if (url.includes(legacyDomain)) {
      return url.replace(`https://${legacyDomain}/`, '/api/files/');
    }
    return url;
  };

  // ─── CORE INFRASTRUCTURE ──────────────────────────────────────────────────
  
  // GET /api/files/* (Serves files from R2)
  if (method === 'GET' && path.startsWith('/api/files/')) {
    const rawKey = path.replace('/api/files/', '');
    const key = decodeURIComponent(rawKey);
    const object = await env.R2_BUCKET.get(key);
    if (!object) return new Response('File not found: ' + key, { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  }

  // GET /api/data/config/site.json
  if (method === 'GET' && path === '/api/data/config/site.json') {
    const config = await env.KV.get('site_config');
    if (!config) return json({ error: 'Config not set' }, 404);
    return json(JSON.parse(config));
  }

  // GET /api/store/settings
  if (method === 'GET' && path === '/api/store/settings') {
    const settings = await env.KV.get('store_settings');
    if (!settings) return json({ error: 'Settings not set' }, 404);
    return json(JSON.parse(settings));
  }

  // ─── USER & PROFILES ROUTES ────────────────────────────────────────────────

  // GET /api/user/me (Syncs and fetches user profile)
  if (method === 'GET' && path === '/api/user/me') {
    let userEmail = '';
    let uid = actorId;
    let full_name = '';
    let avatar_url = '';
    
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        userEmail = payload.email || '';
        uid = payload.sub || uid;
        full_name = payload.user_metadata?.full_name || '';
        avatar_url = payload.user_metadata?.avatar_url || '';
      } catch(e) {}
    }

    // MAP IAN DIRECTLY TO THE EXISTENT DJ FLOWERZ DB ROW
    const _adminEmail = (env.VITE_ADMIN_EMAIL || '').toLowerCase();
    const isIan = userEmail && userEmail === _adminEmail;
    
    if (isIan) {
      uid = 'user_djflowerz'; // Forces all posts/metadata to link perfectly!
    }

    if (!uid) return json({ error: 'Unauthorized' }, 401);

    // Look up existing user
    let user = await env.DB.prepare('SELECT * FROM user_profiles WHERE id = ?').bind(uid).first() as any;
    
    // Auto-create or Auto-sync user if they don't exist
    if (!user) {
      let username = userEmail ? userEmail.split('@')[0].replace(/[^a-z0-9]/g, '') : `user_${uid.substring(0,6)}`;
      if (isIan) username = 'djflowerz'; // Ensure @djflowerz is THE admin handle
      
      const role = isIan ? 'admin' : 'user';
      try {
        await env.DB.prepare(`
          INSERT INTO user_profiles (id, username, display_name, email, avatar_url, role, bio)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          uid, username, full_name || username, userEmail, avatar_url, role, 'New member of DJ Flowerz Community'
        ).run();
        user = await env.DB.prepare('SELECT * FROM user_profiles WHERE id = ?').bind(uid).first();
      } catch(e) {
         const randomUser = username + Math.floor(Math.random()*1000);
         await env.DB.prepare(`
          INSERT INTO user_profiles (id, username, display_name, email, avatar_url, role, bio)
          VALUES (?, ?, ?, ?, ?, ?, ?)
         `).bind(
          uid, randomUser, full_name || randomUser, userEmail, avatar_url, role, 'New member of DJ Flowerz Community'
         ).run();
         user = await env.DB.prepare('SELECT * FROM user_profiles WHERE id = ?').bind(uid).first();
      }
    } else {
      // Sync admin privileges and email if applicable natively
      if (isIan) {
         if (user.role !== 'admin' || user.username !== 'djflowerz') {
           await env.DB.prepare('UPDATE user_profiles SET role = "admin", username = "djflowerz", email = ? WHERE id = ?').bind(userEmail, uid).run();
           user.role = 'admin';
           user.username = 'djflowerz';
         }
      } else if (userEmail && (!user.email || user.email !== userEmail)) {
         await env.DB.prepare('UPDATE user_profiles SET email = ? WHERE id = ?').bind(userEmail, uid).run();
         user.email = userEmail;
      }

      // ── Always sync avatar + display_name from JWT so profile pics stay fresh ──
      const needsAvatarSync = avatar_url && user.avatar_url !== avatar_url;
      const needsNameSync   = full_name  && user.display_name !== full_name;
      if (needsAvatarSync || needsNameSync) {
        const newAvatar = avatar_url || user.avatar_url;
        const newName   = full_name  || user.display_name;
        await env.DB.prepare(
          'UPDATE user_profiles SET avatar_url = ?, display_name = ? WHERE id = ?'
        ).bind(newAvatar, newName, uid).run();
        user.avatar_url   = newAvatar;
        user.display_name = newName;
      }
    }

    return json({ user: {
      ...user,
      fullName: user.display_name,
      avatarUrl: normalizeAssetUrl(user.avatar_url),
      isSubscriber: isIan ? true : user.role === 'admin' || user.role === 'dj'
    } });
  }

  // GET /api/user/profile/:username
  if (method === 'GET' && path.match(/^\/api\/user\/profile\/[^/]+$/)) {
    const username = path.split('/').pop()?.replace('@', ''); // Handle @nairobisound if provided
    const user = await env.DB.prepare('SELECT id, username, display_name as name, avatar_url as avatarUrl, bio, role, location, website, created_at as createdAt FROM user_profiles WHERE username = ?').bind(username).first() as any;
    if (!user) return json({ error: 'User not found' }, 404);
    
    // Fetch their posts
    const result = await env.DB.prepare('SELECT sp.*, CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked FROM social_posts sp LEFT JOIN social_likes sl ON sl.post_id = sp.id AND sl.user_id = ? WHERE sp.author_id = ? ORDER BY sp.created_at DESC').bind(actorId || '', user.id).all();
    const posts = result.results.map((p: any) => ({...p, viewer_liked: p.viewer_liked === 1, like_count: p.likes_count, comment_count: p.comments_count}));
    
    return json({ 
      profile: {
        ...user,
        avatarUrl: normalizeAssetUrl(user.avatarUrl)
      }, 
      posts: posts.map((p: any) => ({
        ...p,
        image_url: normalizeAssetUrl(p.image_url)
      }))
    });
  }

  // GET /api/social/users/search (and /api/profiles/search)
  if (method === 'GET' && (path === '/api/social/users/search' || path === '/api/profiles/search')) {
    const q = url.searchParams.get('q') || '';
    if (!q || q.length < 2) return json({ users: [] });
    
    const result = await env.DB.prepare(`
      SELECT id, username, display_name as name, avatar_url, role 
      FROM user_profiles 
      WHERE username LIKE ? OR display_name LIKE ?
      LIMIT 10
    `).bind(`%${q}%`, `%${q}%`).all();
    
    return json({ users: result.results || [] });
  }

  // ─── /api/profiles/* (used by useProfile hook) ─────────────────────────────

  // GET /api/profiles/:username — full profile + stats + viewer context
  if (method === 'GET' && path.match(/^\/api\/profiles\/[^/]+$/) && !path.endsWith('/posts') && !path.endsWith('/followers') && !path.endsWith('/following')) {
    const uname = path.split('/').pop()?.replace('@', '') || '';
    const profile = await env.DB.prepare(`
      SELECT id, username, display_name, avatar_url, bio, role, location, website,
        COALESCE(twitter, '') as twitter,
        COALESCE(instagram, '') as instagram, 
        COALESCE(soundcloud, '') as soundcloud,
        COALESCE(twitter, '') as twitter_handle,
        COALESCE(instagram, '') as instagram_handle,
        COALESCE(soundcloud, '') as soundcloud_handle,
        COALESCE(banner_url, '') as banner_url,
        COALESCE(is_verified, 0) as is_verified,
        created_at as joined_at,
        pinned_post_id
      FROM user_profiles WHERE username = ?
    `).bind(uname).first() as any;
    if (!profile) return json({ error: 'User not found' }, 404);

    const [followersR, followingR, postsR, isFollowingR] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) as c FROM social_follows WHERE following_id = ?').bind(profile.id),
      env.DB.prepare('SELECT COUNT(*) as c FROM social_follows WHERE follower_id = ?').bind(profile.id),
      env.DB.prepare('SELECT COUNT(*) as c FROM social_posts WHERE author_id = ? AND post_type != "comment"').bind(profile.id),
      ...(actorId ? [env.DB.prepare('SELECT id FROM social_follows WHERE follower_id = ? AND following_id = ?').bind(actorId, profile.id)] : [env.DB.prepare('SELECT null as id WHERE 0')])
    ]);

    return json({
      profile: { ...profile, is_verified: profile.role === 'admin' ? 1 : 0, twitter_handle: profile.twitter, instagram_handle: profile.instagram },
      stats: { followers: (followersR as any).results?.[0]?.c ?? 0, following: (followingR as any).results?.[0]?.c ?? 0, posts: (postsR as any).results?.[0]?.c ?? 0 },
      viewer: { following: !!((isFollowingR as any).results?.[0]?.id), is_owner: actorId === profile.id }
    });
  }

  // GET /api/profiles/:username/posts
  if (method === 'GET' && path.match(/^\/api\/profiles\/[^/]+\/posts$/)) {
    const uname = path.split('/')[3]?.replace('@', '');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const before = url.searchParams.get('before');
    const type = url.searchParams.get('type') || 'posts';

    const profile = await env.DB.prepare('SELECT id FROM user_profiles WHERE username = ?').bind(uname).first() as any;
    if (!profile) return json({ error: 'User not found' }, 404);

    let whereClause = `WHERE sp.author_id = ? AND sp.post_type != 'comment'`;
    if (type === 'replies') whereClause = `WHERE sp.author_id = ? AND sp.post_type = 'comment'`;
    if (type === 'media') whereClause = `WHERE sp.author_id = ? AND sp.image_url IS NOT NULL`;
    if (type === 'hardware') whereClause = `WHERE sp.author_id = ? AND sp.is_marketplace = 1`;
    if (before) whereClause += ` AND sp.created_at < '${before}'`;

    const result = await env.DB.prepare(`
      SELECT sp.*, 
        u.display_name as author_name, u.avatar_url as author_avatar, u.username as author_username, u.role as author_role,
        CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked
      FROM social_posts sp
      LEFT JOIN user_profiles u ON sp.author_id = u.id
      LEFT JOIN social_likes sl ON sl.post_id = sp.id AND sl.user_id = ?
      ${whereClause}
      ORDER BY sp.created_at DESC LIMIT ?
    `).bind(actorId || '', profile.id, limit + 1).all();

    const posts = result.results || [];
    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    return json({
      posts: posts.map((p: any) => ({ ...p, viewer_liked: p.viewer_liked === 1, like_count: p.likes_count, comment_count: p.comments_count })),
      next_cursor: hasMore ? (posts[posts.length - 1] as any)?.created_at : null
    });
  }

  // POST /api/profiles/:username/follow — toggle follow
  if (method === 'POST' && path.match(/^\/api\/profiles\/[^/]+\/follow$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const uname = path.split('/')[3]?.replace('@', '');
    const target = await env.DB.prepare('SELECT id FROM user_profiles WHERE username = ?').bind(uname).first() as any;
    if (!target) return json({ error: 'User not found' }, 404);
    if (target.id === actorId) return json({ error: 'Cannot follow yourself' }, 400);

    const existing = await env.DB.prepare('SELECT id FROM social_follows WHERE follower_id = ? AND following_id = ?').bind(actorId, target.id).first();
    if (existing) {
      await env.DB.prepare('DELETE FROM social_follows WHERE follower_id = ? AND following_id = ?').bind(actorId, target.id).run();
      return json({ following: false });
    } else {
      await env.DB.prepare('INSERT OR IGNORE INTO social_follows (id, follower_id, following_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), actorId, target.id).run();
      return json({ following: true });
    }
  }

  // PATCH /api/profiles/:username — update profile
  if (method === 'PATCH' && path.match(/^\/api\/profiles\/[^/]+$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const uname = path.split('/')[3]?.replace('@', '');
    const profile = await env.DB.prepare('SELECT id FROM user_profiles WHERE username = ?').bind(uname).first() as any;
    if (!profile) return json({ error: 'User not found' }, 404);
    if (profile.id !== actorId) return json({ error: 'Forbidden' }, 403);

    const body = await request.json() as any;
    const { display_name, bio, location, website, avatar_url, banner_url, twitter, instagram, soundcloud } = body;
    
    await env.DB.prepare(`
      UPDATE user_profiles SET 
        display_name = COALESCE(?, display_name),
        bio = COALESCE(?, bio),
        location = COALESCE(?, location),
        website = COALESCE(?, website),
        avatar_url = COALESCE(?, avatar_url),
        banner_url = COALESCE(?, banner_url),
        twitter = COALESCE(?, twitter),
        instagram = COALESCE(?, instagram),
        soundcloud = COALESCE(?, soundcloud)
      WHERE id = ?
    `).bind(display_name, bio, location, website, avatar_url, banner_url, twitter, instagram, soundcloud, actorId).run();

    return json({ success: true });
  }

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
        u.display_name as author_name, u.avatar_url as author_avatar, u.username as author_username, u.role as author_role,
        CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked
      FROM social_posts sp
      LEFT JOIN user_profiles u ON u.id = sp.author_id
      LEFT JOIN social_likes sl ON sl.post_id = sp.id AND sl.user_id = ?
    `;

    if (tab === 'following' && userId) {
      query = `${baseSelect}
        INNER JOIN social_follows sf ON sf.following_id = sp.author_id AND sf.follower_id = ?
        WHERE (sp.post_type IS NULL OR sp.post_type != 'comment') ${before ? 'AND sp.created_at < ?' : ''}
        ORDER BY sp.created_at DESC LIMIT ?`;
      params.push(userId || '', userId, ...(before ? [before] : []), limit + 1);
    } else if (tab === 'trending') {
      query = `${baseSelect}
        WHERE (sp.post_type IS NULL OR sp.post_type != 'comment') ${before ? 'AND sp.created_at < ?' : ''}
        ORDER BY sp.likes_count DESC, sp.comments_count DESC, sp.created_at DESC LIMIT ?`;
      params.push(userId || '', ...(before ? [before] : []), limit + 1);
    } else if (tab === 'marketplace') {
      query = `${baseSelect}
        WHERE sp.is_marketplace = 1 AND (sp.post_type IS NULL OR sp.post_type != 'comment') ${before ? 'AND sp.created_at < ?' : ''}
        ORDER BY sp.created_at DESC LIMIT ?`;
      params.push(userId || '', ...(before ? [before] : []), limit + 1);
    } else {
      // latest (default)
      query = `${baseSelect}
        WHERE (sp.post_type IS NULL OR sp.post_type != 'comment') ${before ? 'AND sp.created_at < ?' : ''}
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
      SELECT sp.*, 
        u.display_name as author_name, u.avatar_url as author_avatar, u.username as author_username, u.role as author_role,
        CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked
      FROM social_posts sp
      LEFT JOIN user_profiles u ON u.id = sp.author_id
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
      SELECT sp.*, u.display_name as author_name, u.avatar_url as author_avatar, u.username as author_username
      FROM social_posts sp
      LEFT JOIN user_profiles u ON u.id = sp.author_id
      WHERE sp.post_type = 'comment' AND sp.reply_to_id = ? 
      ORDER BY sp.created_at ASC LIMIT ?
    `).bind(postId, limit).all();

    return json({ comments: result.results || [] });
  }

  // POST /api/social/posts
  if (method === 'POST' && path === '/api/social/posts') {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as any;
    const { content, media_urls, is_marketplace, price, post_type, reply_to_id, quote_of_id } = body;

    // Fetch author info from user_profiles table
    let author = await env.DB.prepare(
      'SELECT id, display_name as name, avatar_url, username, role FROM user_profiles WHERE id = ?'
    ).bind(actorId).first() as any;

    // FALLBACK PROTECTION: If profile is missing from D1, use generic member info
    // This prevents the 'DJ Flowerz Team' attribution error for new accounts
    const authorName = author?.name || author?.username || 'Community Member';
    const authorAvatar = author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=7C3AED&color=fff`;
    const authorUsername = author?.username || `user_${actorId.substring(0, 8)}`;
    const authorRole = author?.role || 'user';

    const id = crypto.randomUUID();
    const imageUrl = Array.isArray(media_urls) && media_urls.length > 0 ? media_urls[0] : null;

    // Use specific provided type or detect from context
    const finalType = post_type || (reply_to_id ? 'comment' : (quote_of_id ? 'reshare' : 'post'));

    await env.DB.prepare(`
      INSERT INTO social_posts (
        id, author_id, author_name, author_avatar, author_username, author_role,
        content, image_url, media_urls, is_marketplace, price, post_type, reply_to_id, quote_of_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      actorId,
      authorName,
      authorAvatar,
      authorUsername,
      authorRole,
      content || '',
      imageUrl,
      JSON.stringify(media_urls || []),
      is_marketplace ? 1 : 0,
      price || 0,
      finalType,
      reply_to_id || null,
      quote_of_id || null
    ).run();

    // If reply, increment parent comments_count
    if (reply_to_id) {
      await env.DB.prepare(
        'UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = ?'
      ).bind(reply_to_id).run();
      
      try {
        const parentPost = await env.DB.prepare('SELECT author_id FROM social_posts WHERE id = ?').bind(reply_to_id).first() as any;
        if (parentPost && parentPost.author_id !== actorId) {
          await env.DB.prepare(`
            INSERT INTO notifications (id, user_id, type, actor_id, actor_name, actor_avatar, target_id, content, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).bind(crypto.randomUUID(), parentPost.author_id, 'comment', actorId, authorName, authorAvatar, reply_to_id, 'replied to your broadcast', new Date().toISOString()).run();
        }
      } catch (e) { console.error('Notification error', e); }
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
      const post = await env.DB.prepare('SELECT author_id, likes_count FROM social_posts WHERE id = ?').bind(postId).first() as any;

      try {
        if (post && post.author_id !== actorId) {
          const liker = await env.DB.prepare('SELECT display_name as name, avatar_url FROM user_profiles WHERE id = ?').bind(actorId).first() as any;
          await env.DB.prepare(`
            INSERT INTO notifications (id, user_id, type, actor_id, actor_name, actor_avatar, target_id, content, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).bind(crypto.randomUUID(), post.author_id, 'like', actorId, liker?.name || 'A user', liker?.avatar_url || '', postId, 'vibed with your broadcast', new Date().toISOString()).run();
        }
      } catch (e) { console.error('Notification error', e); }

      return json({ liked: true, count: post?.likes_count ?? 0 });
    }
  }

  // DELETE /api/social/posts/:id
  if (method === 'DELETE' && path.match(/^\/api\/social\/posts\/[^/]+$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    const postId = path.split('/').pop();

    const post = await env.DB.prepare('SELECT author_id FROM social_posts WHERE id = ?').bind(postId).first() as any;
    if (!post) return json({ error: 'Not found' }, { status: 404 });

    const user = await env.DB.prepare('SELECT role FROM user_profiles WHERE id = ?').bind(actorId).first() as any;
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
      'SELECT id, display_name as name, avatar_url, username, role FROM user_profiles WHERE id = ?'
    ).bind(actorId).first() as any;


    try {
      await env.DB.prepare('INSERT INTO social_reshares (id, post_id, user_id) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), postId, actorId).run();
      await env.DB.prepare(
        'UPDATE social_posts SET reshare_count = reshare_count + 1 WHERE id = ?'
      ).bind(postId).run();
      
      // Create reshare post
      const authorName = author?.name || author?.username || 'Community Member';
      const authorAvatar = author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=7C3AED&color=fff`;
      const authorUsername = author?.username || `user_${actorId.substring(0, 8)}`;
      const authorRole = author?.role || 'user';

      await env.DB.prepare(`
        INSERT INTO social_posts (id, author_id, author_name, author_avatar, author_username, author_role, content, post_type, quote_of_id)
        VALUES (?, ?, ?, ?, ?, ?, '', 'reshare', ?)
      `).bind(
        crypto.randomUUID(), actorId,
        authorName, authorAvatar,
        authorUsername, authorRole, postId
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
        
      try {
        const follower = await env.DB.prepare('SELECT display_name as name, avatar_url FROM user_profiles WHERE id = ?').bind(actorId).first() as any;
        if (follower) {
          await env.DB.prepare(`
            INSERT INTO notifications (id, user_id, type, actor_id, actor_name, actor_avatar, target_id, content, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).bind(crypto.randomUUID(), targetId, 'follow', actorId, follower.name || 'A user', follower.avatar_url || '', targetId, 'started tracking your signals', new Date().toISOString()).run();
        }
      } catch (e) { console.error('Notification error', e); }

      return json({ followed: true });
    }
  }

  // POST /api/social/posts/:id/pin
  if (method === 'POST' && path.match(/^\/api\/social\/posts\/[^/]+\/pin$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const postId = path.split('/')[4];
    
    // Check if post belongs to user
    const post = await env.DB.prepare('SELECT author_id FROM social_posts WHERE id = ?').bind(postId).first() as any;
    if (!post || post.author_id !== actorId) return json({ error: 'Forbidden' }, 403);

    // Get current pinned_post_id to toggle
    try {
      const profile = await env.DB.prepare('SELECT pinned_post_id FROM user_profiles WHERE id = ?').bind(actorId).first() as any;
      const isCurrentlyPinned = profile?.pinned_post_id === postId;
      await env.DB.prepare('UPDATE user_profiles SET pinned_post_id = ? WHERE id = ?').bind(isCurrentlyPinned ? null : postId, actorId).run();
      return json({ pinned: !isCurrentlyPinned });
    } catch(e) {
      return json({ error: 'Failed to pin. Ensure column exists.' }, 500);
    }
  }

  // GET /api/social/messages/:userId
  if (method === 'GET' && path.match(/^\/api\/social\/messages\/[^/]+$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const targetUserId = path.split('/').pop();

    try {
      const messages = await env.DB.prepare(`
        SELECT * FROM direct_messages 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC LIMIT 100
      `).bind(actorId, targetUserId, targetUserId, actorId).all();
      return json({ messages: messages.results || [] });
    } catch (e) {
      return json({ messages: [], error: 'Table may not exist' });
    }
  }

  // POST /api/social/messages/:userId
  if (method === 'POST' && path.match(/^\/api\/social\/messages\/[^/]+$/)) {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const targetUserId = path.split('/').pop();
    const body = await request.json() as any;
    
    if (!body.content || !body.content.trim()) return json({ error: 'Content required' }, 400);

    try {
      const id = crypto.randomUUID();
      const content = body.content.trim();
      const now = new Date().toISOString();
      await env.DB.prepare(`
        INSERT INTO direct_messages (id, sender_id, receiver_id, content, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `).bind(id, actorId, targetUserId, content, now).run();
      
      const msg = await env.DB.prepare('SELECT * FROM direct_messages WHERE id = ?').bind(id).first();
      return json({ success: true, message: msg });
    } catch (e) {
      return json({ error: 'Failed to insert message' }, 500);
    }
  }

  // GET /api/social/profiles/:username/mutuals
  if (method === 'GET' && path.match(/^\/api\/social\/profiles\/[^/]+\/mutuals$/)) {
    if (!actorId) return json({ mutuals: { count: 0, text: '' } });
    const targetUsername = path.split('/')[4];
    
    const target = await env.DB.prepare('SELECT id FROM user_profiles WHERE username = ?').bind(targetUsername).first() as any;
    if (!target || target.id === actorId) return json({ mutuals: { count: 0, text: '' } });

    // Users that ACTOR follows AND TARGET is followed by
    const result = await env.DB.prepare(`
      SELECT u.username 
      FROM user_profiles u
      INNER JOIN social_follows sf1 ON sf1.following_id = u.id AND sf1.follower_id = ?
      INNER JOIN social_follows sf2 ON sf2.follower_id = u.id AND sf2.following_id = ?
      LIMIT 10
    `).bind(actorId, target.id).all();

    const mutuals = result.results || [];
    if (mutuals.length === 0) return json({ mutuals: { count: 0, text: '' } });

    const first = (mutuals[0] as any).username;
    const text = mutuals.length > 1 
      ? \`Connected with @\${first} and \${mutuals.length - 1} other\${mutuals.length > 2 ? 's' : ''} you know.\`
      : \`Connected with @\${first} whom you know.\`;

    return json({ mutuals: { count: mutuals.length, text, users: mutuals } });
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
      SELECT id, display_name as name, avatar_url, username, role, bio, banner_url as cover_url,
        location, website, dj_genre, dj_since, pinned_post_id,
        instagram, soundcloud, mixcloud, is_verified, created_at,
        (SELECT COUNT(*) FROM social_posts 
          WHERE author_id = user_profiles.id AND post_type != 'reshare') as post_count,
        (SELECT COUNT(*) FROM social_follows 
          WHERE following_id = user_profiles.id) as followers_count,
        (SELECT COUNT(*) FROM social_follows 
          WHERE follower_id = user_profiles.id) as following_count
      FROM user_profiles WHERE username = ? OR id = ?
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
        u.display_name as author_name, u.avatar_url as author_avatar, u.username as author_username, u.role as author_role,
        CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as viewer_liked
      FROM social_posts sp
      LEFT JOIN user_profiles u ON u.id = sp.author_id
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
    const { bio, banner_url, location, website, dj_genre, dj_since, instagram, soundcloud, mixcloud } = body;

    await env.DB.prepare(`
      UPDATE user_profiles SET
        bio = COALESCE(?, bio),
        banner_url = COALESCE(?, banner_url),
        location = COALESCE(?, location),
        website = COALESCE(?, website),
        dj_genre = COALESCE(?, dj_genre),
        dj_since = COALESCE(?, dj_since),
        instagram = COALESCE(?, instagram),
        soundcloud = COALESCE(?, soundcloud),
        mixcloud = COALESCE(?, mixcloud)
      WHERE id = ?
    `).bind(
      bio ?? null, banner_url ?? null, location ?? null,
      website ?? null, dj_genre ?? null, dj_since ?? null,
      instagram ?? null, soundcloud ?? null, mixcloud ?? null,
      actorId
    ).run();

    const updated = await env.DB.prepare('SELECT *, display_name as name, banner_url as cover_url FROM user_profiles WHERE id = ?').bind(actorId).first();
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
    
    await env.DB.prepare('UPDATE user_profiles SET pinned_post_id = ? WHERE id = ?')
      .bind(postId, actorId).run();
    return json({ success: true });
  }

  // DELETE /api/social/profile/pin
  if (method === 'DELETE' && path === '/api/social/profile/pin') {
    if (!actorId) return json({ error: 'Unauthorized' }, { status: 401 });
    await env.DB.prepare('UPDATE user_profiles SET pinned_post_id = NULL WHERE id = ?')
      .bind(actorId).run();
    return json({ success: true });
  }

  // GET /api/community/suggested
  if (method === 'GET' && path === '/api/community/suggested') {
    const userId = url.searchParams.get('userId') || actorId;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 20);

    const result = await env.DB.prepare(`
      SELECT u.id, u.display_name as name, u.avatar_url, u.username, u.role,
        (SELECT COUNT(*) FROM social_posts WHERE author_id = u.id) as post_count,
        (SELECT COUNT(*) FROM social_follows WHERE following_id = u.id) as followers
      FROM user_profiles u
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

  if (path.startsWith('/api/admin/')) {
    if (!token) return json({ error: 'Unauthorized — no token provided' }, { status: 401 });

    let userEmail = '';
    try {
      const payloadBase64 = token.split('.')[1];
      const base64 = payloadBase64.replace(/\-/g, '+').replace(/_/g, '/');
      const payloadStr = atob(base64);
      const payload = JSON.parse(payloadStr);
      userEmail = payload.email || '';
    } catch (e) {
      console.error('JWT parse error:', e);
      return json({ error: 'Unauthorized — invalid token format' }, { status: 401 });
    }

    const adminEmail = env.VITE_ADMIN_EMAIL || '';
    
    // Strict email enforcement
    if (userEmail.toLowerCase() !== adminEmail.toLowerCase()) {
      console.warn(`[Admin Blocked] Unauthorized email attempt: ${userEmail}`);
      return json({ error: `Forbidden — Administrator access strictly limited to authorized email.` }, { status: 403 });
    }


    // GET /api/admin/dashboard
    if (path === '/api/admin/dashboard' && method === 'GET') {
      try {
        const stats = await env.DB.batch([
          env.DB.prepare('SELECT SUM(amount_kes) as total FROM payments WHERE status = "success" OR status = "paid"'),
          env.DB.prepare('SELECT COUNT(*) as count FROM orders'),
          env.DB.prepare('SELECT COUNT(*) as count FROM mixtapes WHERE status = "published"'),
          env.DB.prepare('SELECT COUNT(*) as count FROM user_profiles WHERE role = "user" OR role = "dj"'),
          env.DB.prepare('SELECT SUM(amount) as total FROM tips WHERE status = "success" OR status = "completed"'),
          env.DB.prepare('SELECT COUNT(*) as count FROM user_profiles'),

          env.DB.prepare('SELECT * FROM payments ORDER BY created_at DESC LIMIT 5'),
          env.DB.prepare('SELECT * FROM tips ORDER BY created_at DESC LIMIT 5')
        ]);

        const totalRevenue = ((stats[0].results?.[0] as any)?.total || 0) + ((stats[4].results?.[0] as any)?.total || 0);
        
        const recentPayments = (stats[6].results || []).map((p: any) => ({
          id: p.id,
          type: 'payment',
          email: p.customer_email,
          amount: p.amount_kes || 0,
          status: p.status,
          createdAt: p.created_at
        }));

        const recentTips = (stats[7].results || []).map((t: any) => ({
          id: t.id,
          type: 'tip',
          name: t.donor_name,
          email: t.donor_email,
          amount: t.amount || 0,
          status: t.status,
          createdAt: t.created_at
        }));

        const recentActivity = [...recentPayments, ...recentTips]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        return json({
          totalRevenue,
          confirmedRevenue: totalRevenue,
          totalOrders: (stats[1].results?.[0] as any)?.count || 0,
          activeMixtapes: (stats[2].results?.[0] as any)?.count || 0,
          activeUsers: (stats[3].results?.[0] as any)?.count || 0,
          totalTips: (stats[4].results?.[0] as any)?.count || 0,
          totalUsers: (stats[5].results?.[0] as any)?.count || 0,
          recentActivity
        });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
    }

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT id, username, display_name as name, email, avatar_url, role, 
               created_at,
               (SELECT expires_at FROM subscriptions WHERE id = user_profiles.id AND status = 'active' ORDER BY expires_at DESC LIMIT 1) as subscription_expiry,
               (SELECT COUNT(*) FROM subscriptions WHERE id = user_profiles.id AND status = 'active') as is_subscriber
        FROM user_profiles 
        ORDER BY created_at DESC
      `).all();
      return json(results);
    }

    // GET /api/admin/orders
    if (path === '/api/admin/orders' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
      return json(results);
    }

    // GET /api/admin/mixtapes
    if (path === '/api/admin/mixtapes' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM mixtapes ORDER BY created_at DESC').all();
      const mapped = (results || []).map((m: any) => ({
        ...m,
        // Frontend expects camelCase for many fields in Admin Dashboard
        coverUrl: normalizeAssetUrl(m.cover_url),
        audioUrl: normalizeAssetUrl(m.audio_url),
        downloadUrl: normalizeAssetUrl(m.download_url),
        videoUrl: normalizeAssetUrl(m.video_url),
        videoDownloadUrl: normalizeAssetUrl(m.video_download_url),
        // Keep snake_case for consistency with DB if needed
        cover_url: normalizeAssetUrl(m.cover_url),
        audio_url: normalizeAssetUrl(m.audio_url),
        tags: typeof m.tags === 'string' ? JSON.parse(m.tags || '[]') : (m.tags || []),
        tracklist: typeof m.tracklist === 'string' ? JSON.parse(m.tracklist || '[]') : (m.tracklist || [])
      }));
      return json(mapped);
    }

    // POST /api/admin/mixtapes
    if (path === '/api/admin/mixtapes' && method === 'POST') {
      const data = await request.json() as any;
      const id = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO mixtapes (
          id, title, artist, genre, duration, cover_url, audio_url, download_url, 
          video_url, video_download_url, tags, is_featured, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        data.title,
        data.artist || '',
        data.genre || '',
        data.duration || '',
        data.coverUrl || data.cover_url || '',
        data.audioUrl || data.audio_url || '',
        data.downloadUrl || data.download_url || '',
        data.videoUrl || data.video_url || '',
        data.videoDownloadUrl || data.video_download_url || '',
        JSON.stringify(data.tags || []),
        data.isFeatured ? 1 : 0,
        data.status || 'published'
      ).run();
      return json({ success: true, id });
    }

    // PUT /api/admin/mixtapes/:id
    const mixtapeMatch = path.match(/^\/api\/admin\/mixtapes\/([^/]+)$/);
    if (mixtapeMatch && method === 'PUT') {
      const id = mixtapeMatch[1];
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE mixtapes SET 
          title = ?, artist = ?, genre = ?, duration = ?, 
          cover_url = ?, audio_url = ?, download_url = ?, 
          video_url = ?, video_download_url = ?, tags = ?, 
          is_featured = ?, status = ?
        WHERE id = ?
      `).bind(
        data.title,
        data.artist || '',
        data.genre || '',
        data.duration || '',
        data.coverUrl || data.cover_url || '',
        data.audioUrl || data.audio_url || '',
        data.downloadUrl || data.download_url || '',
        data.videoUrl || data.video_url || '',
        data.videoDownloadUrl || data.video_download_url || '',
        JSON.stringify(data.tags || []),
        data.isFeatured ? 1 : 0,
        data.status || 'published',
        id
      ).run();
      return json({ success: true });
    }

    // DELETE /api/admin/mixtapes/:id
    if (mixtapeMatch && method === 'DELETE') {
      const id = mixtapeMatch[1];
      await env.DB.prepare('DELETE FROM mixtapes WHERE id = ?').bind(id).run();
      return json({ success: true });
    }

    // GET /api/admin/products
    if (path === '/api/admin/products' && method === 'GET') {
      const [productsR, variantsR] = await env.DB.batch([
        env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC'),
        env.DB.prepare('SELECT * FROM product_variants')
      ]);
      
      const products = productsR.results || [];
      const variants = variantsR.results || [];
      
      const mapped = products.map((p: any) => ({
        ...p,
        image_url: normalizeAssetUrl(p.image_url),
        imageUrl: normalizeAssetUrl(p.image_url), // Support both cases
        variants: variants.filter((v: any) => v.product_id === p.id).map((v: any) => ({
          ...v,
          image_url: normalizeAssetUrl(v.image_url),
          imageUrl: normalizeAssetUrl(v.image_url) // Support both cases
        }))
      }));
      return json(mapped);
    }

    // POST /api/admin/products
    if (path === '/api/admin/products' && method === 'POST') {
      const data = await request.json() as any;
      const id = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO products (
          id, name, slug, description, price, image_url, category, type, stock, status, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        data.name,
        data.slug,
        data.description || '',
        data.price || 0,
        data.imageUrl || data.image_url || '',
        data.category || 'Music',
        data.type || 'digital',
        data.stock || 0,
        data.status || 'published',
        data.isFeatured ? 1 : 0
      ).run();
      
      // Handle variants if provided
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        const variantStatements = data.variants.map((v: any) => 
          env.DB.prepare(`
            INSERT INTO product_variants (id, product_id, name, sku, price, inventory, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), id, v.name, v.sku || '', v.price || data.price, v.inventory || 0, v.imageUrl || v.image_url || '')
        );
        await env.DB.batch(variantStatements);
      }
      
      return json({ success: true, id });
    }

    // PUT /api/admin/products/:id
    const productMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (productMatch && method === 'PUT') {
      const id = productMatch[1];
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE products SET 
          name = ?, slug = ?, description = ?, price = ?, 
          image_url = ?, category = ?, type = ?, stock = ?, 
          status = ?, is_featured = ?
        WHERE id = ?
      `).bind(
        data.name,
        data.slug,
        data.description || '',
        data.price || 0,
        data.imageUrl || data.image_url || '',
        data.category || 'Music',
        data.type || 'digital',
        data.stock || 0,
        data.status || 'published',
        data.isFeatured ? 1 : 0,
        id
      ).run();
      
      // Update variants (simplified: delete and re-insert or update existing)
      if (Array.isArray(data.variants)) {
        await env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(id).run();
        if (data.variants.length > 0) {
          const variantStatements = data.variants.map((v: any) => 
            env.DB.prepare(`
              INSERT INTO product_variants (id, product_id, name, sku, price, inventory, image_url)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(crypto.randomUUID(), id, v.name, v.sku || '', v.price || data.price, v.inventory || 0, v.imageUrl || v.image_url || '')
          );
          await env.DB.batch(variantStatements);
        }
      }
      
      return json({ success: true });
    }

    // DELETE /api/admin/products/:id
    if (productMatch && method === 'DELETE') {
      const id = productMatch[1];
      await env.DB.batch([
        env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(id),
        env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id)
      ]);
      return json({ success: true });
    }

    // GET /api/admin/active-subscribers
    if (path === '/api/admin/active-subscribers' && method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT u.id, u.username, u.display_name as name, u.email, u.avatar_url, s.plan_id, s.expires_at
        FROM user_profiles u
        INNER JOIN subscriptions s ON s.id = u.id
        WHERE s.status = 'active' AND s.expires_at > DATETIME('now')
      `).all();
      const mapped = (results || []).map((r: any) => ({
        ...r,
        avatar_url: normalizeAssetUrl(r.avatar_url)
      }));
      return json(mapped);
    }

    // GET /api/admin/notifications
    if (path === '/api/admin/notifications' && method === 'GET') {
      return json([]); // Placeholder for now
    }

    // POST /api/admin/r2-sync
    if (path === '/api/admin/r2-sync' && method === 'POST') {
      return json({ success: true, message: 'Sync triggered' });
    }

    // POST /api/admin/r2-upload
    if (path === '/api/admin/r2-upload' && method === 'POST') {
      try {
        const rawFileName = request.headers.get('x-file-name');
        const fileName = rawFileName ? decodeURIComponent(rawFileName) : `upload_${Date.now()}`;
        const folder = request.headers.get('x-folder') || 'uploads';
        const contentType = request.headers.get('content-type') || 'application/octet-stream';
        
        const fileId = crypto.randomUUID();
        const ext = fileName.split('.').pop() || 'bin';
        const objectKey = `${folder}/${fileId}.${ext}`;
        
        const body = await request.arrayBuffer();
        await env.R2_BUCKET.put(objectKey, body, {
          httpMetadata: { contentType }
        });
        
        const fileUrl = `https://${env.PUBLIC_R2_DOMAIN}/${objectKey}`;
        console.log(`[R2 Upload] Success: ${fileUrl} (Key: ${objectKey})`);
        return json({ success: true, url: fileUrl, key: objectKey });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
    }

    // GET /api/admin/system/health
    if (path === '/api/admin/system/health' && method === 'GET') {
      return json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' });
    }

    // GET /api/admin/stats
    if (path === '/api/admin/stats' && method === 'GET') {
      const stats = await env.DB.batch([
        env.DB.prepare('SELECT COUNT(*) as count FROM user_profiles'),
        env.DB.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE status = "active"'),
        env.DB.prepare('SELECT SUM(amount) as total FROM payments WHERE status = "success" OR status = "paid"'),
        env.DB.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at > DATETIME("now", "-30 days")'),
        env.DB.prepare('SELECT SUM(total) as total FROM orders WHERE status = "completed" OR status = "shipped"')
      ]);
      return json({
        total_users: (stats[0].results?.[0] as any)?.count || 0,
        active_subs: (stats[1].results?.[0] as any)?.count || 0,
        total_revenue: ((stats[2].results?.[0] as any)?.total || 0) + ((stats[4].results?.[0] as any)?.total || 0),
        monthly_sales_count: (stats[3].results?.[0] as any)?.count || 0
      });
    }

    // GET /api/admin/expiry-watch
    if (path === '/api/admin/expiry-watch' && method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT u.email, u.display_name as name, s.expires_at, s.plan_id
        FROM subscriptions s
        JOIN user_profiles u ON s.id = u.id
        WHERE s.status = 'active' 
        AND s.expires_at BETWEEN DATETIME('now') AND DATETIME('now', '+7 days')
      `).all();
      return json(results);
    }

    // GET /api/admin/installments
    if (path === '/api/admin/installments' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM installments ORDER BY created_at DESC').all();
      return json(results);
    }

    // GET /api/admin/newsletter_subscribers
    if (path === '/api/admin/newsletter_subscribers' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC').all();
      return json(results);
    }

    // POST /api/admin/subscriptions/grant
    if (path === '/api/admin/subscriptions/grant' && method === 'POST') {
      const { userId, planId, months } = await request.json() as any;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + (months || 1));
      const expiryStr = expiry.toISOString();
      
      await env.DB.prepare(`
        INSERT INTO subscriptions (id, plan_id, status, expires_at)
        VALUES (?, ?, 'active', ?)
        ON CONFLICT(id) DO UPDATE SET status='active', expires_at=?, plan_id=?
      `).bind(userId, planId, expiryStr, expiryStr, planId).run();
      
      await env.DB.prepare('UPDATE user_profiles SET role = "dj" WHERE id = ? AND role = "user"').bind(userId).run();
      return json({ success: true });
    }

    // POST /api/admin/revoke-access
    if (path === '/api/admin/revoke-access' && method === 'POST') {
      const { email } = await request.json() as any;
      const user = await env.DB.prepare('SELECT id FROM user_profiles WHERE email = ?').bind(email).first();
      if (user) {
        await env.DB.prepare('UPDATE subscriptions SET status = "expired" WHERE id = ?').bind((user as any).id).run();
        return json({ success: true });
      }
      return json({ error: 'User not found' }, 404);
    }

    // GET /api/admin/payments
    if (path === '/api/admin/payments' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM payments ORDER BY created_at DESC').all();
      return json(results);
    }

    // GET /api/admin/finances/tips
    if (path === '/api/admin/finances/tips' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM tips ORDER BY created_at DESC').all();
      return json(results);
    }

    // GET /api/admin/newsletter_campaigns
    if (path === '/api/admin/newsletter_campaigns' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM newsletter_campaigns ORDER BY created_at DESC').all();
      return json(results);
    }

    // GET /api/admin/coupons
    if (path === '/api/admin/coupons' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
      return json(results);
    }

    // GET /api/admin/chat/sessions
    if (path === '/api/admin/chat/sessions' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM chat_sessions ORDER BY last_message_at DESC').all();
      return json(results);
    }

    // GET /api/admin/system/health
    if (path === '/api/admin/system/health' && method === 'GET') {
      return json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' });
    }

    // GET /api/admin/system/security/pin
    if (path === '/api/admin/system/security/pin' && method === 'GET') {
      return json({ enabled: true, setup: true });
    }

    // GET /api/admin/escrow/payout-queue
    if (path === '/api/admin/escrow/payout-queue' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, donor_name as name, amount, status, created_at FROM tips WHERE status = "success" ORDER BY created_at DESC').all();
      return json(results);
    }

    // POST /api/admin/sync-paystack (Stub)
    if (path === '/api/admin/sync-paystack' && method === 'POST') {
      return json({ success: true, synced: 0 });
    }
  }


  // ─── 404 ─────────────────────────────────────────────────────────────────────
  return json({ error: `Route ${method} ${path} not found` }, 404);
}
