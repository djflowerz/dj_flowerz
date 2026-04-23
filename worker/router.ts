import { Env } from './types';

// Helper to generate referral codes
function generateReferralCode(name: string) {
  const prefix = (name || 'USR').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
  const ADMIN_EMAILS = [
    (env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com').toLowerCase(),
    'djflowerz254@gmail.com'
  ];
  const adminEmail = ADMIN_EMAILS[0];

  // ─── Resolve the real User ID from JWT ───
  let actorId = request.headers.get('X-Actor-Id') || null;
  let jwtEmail = '';
  if (token) {
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      jwtEmail = (payload.email || payload.user_metadata?.email || '').toLowerCase();
      if (!actorId) actorId = payload.sub || null;
    } catch(e) {}
  }

  // ─── CORS Preflight ──────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Actor-Id, X-Actor-Role, X-Actor-Email, x-file-name, x-folder',
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Actor-Id, X-Actor-Role, X-Actor-Email, x-file-name, x-folder',
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
  
  // GET /api/files/* (Serves files from R2 or proxies from external hubs)
  if (method === 'GET' && path.startsWith('/api/files/')) {
    const origin = url.searchParams.get('origin');
    
    // Proxy to remix worker if requested
    if (origin === 'remix') {
      const targetUrl = new URL(`https://remix-and-mashups-worker.dennismacharia20.workers.dev`);
      targetUrl.pathname = path.replace('/api/files/', '');
      url.searchParams.forEach((v, k) => {
        if (k !== 'origin') targetUrl.searchParams.set(k, v);
      });

      console.log(`[Proxy] Fetching from remix worker: ${targetUrl.toString()}`);
      
      const response = await fetch(targetUrl.toString(), {
        headers: { 'Accept': 'application/json, application/octet-stream' }
      });
      
      // Mirror the response
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;
    }

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

  // POST /api/upload (Authenticated File Upload - accessible to regular users)
  if (path === '/api/upload' && method === 'POST') {
    if (!token) return json({ error: 'Unauthorized' }, 401);
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

  // POST /api/pool/download (Proxy asset download)
  if (path === '/api/pool/download' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    try {
      const { url: fileUrl, fileName, trackId, type, orderId } = await request.json() as any;
      if (!fileUrl) return json({ error: 'URL is required' }, 400);
      
      const sub = await env.DB.prepare('SELECT status, expiry_date FROM "active-subscribers" WHERE user_email = ? OR id = ?').bind(jwtEmail.toLowerCase(), actorId).first() as any;
      const isExpired = sub && sub.expiry_date && new Date(sub.expiry_date) < new Date();
      const isActiveSub = sub && sub.status === 'active' && !isExpired;
      const isAdmin = jwtEmail && ADMIN_EMAILS.includes(jwtEmail.toLowerCase());

      // Require subscription unless it's an order or a public mixtape
      if (!isActiveSub && !orderId && type !== 'mixtape_audio' && type !== 'mixtape_video') {
         if (!isAdmin) {
             return json({ error: isExpired ? 'Your subscription has expired' : 'Active subscription required' }, 403);
         }
      }

      // Simple implementation: return the redirect URL directly to the frontend
      // In a strict setup, we would generate a signed URL or proxy the stream.
      return json({ success: true, redirectUrl: fileUrl, fileName });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ─── IDENTITY & COMMUNITY (The Pulse) ──────────────────────────────────
  
  // GET /api/profiles/leaders (Top Aura Users)
  if (path === '/api/profiles/leaders' && method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT handle, full_name, avatar_url, aura_tier, aura_points 
      FROM profiles 
      WHERE handle IS NOT NULL 
      ORDER BY aura_points DESC 
      LIMIT 10
    `).all();
    return json(results || []);
  }

  // GET /api/community/stats
  if (path === '/api/community/stats' && method === 'GET') {
    const stats = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) as count FROM pulses'),
      env.DB.prepare('SELECT COUNT(*) as count FROM profiles WHERE handle IS NOT NULL'),
      env.DB.prepare('SELECT SUM(deal_price) as total FROM pulses WHERE type = "deal"')
    ]);
    return json({
      totalPulses: (stats[0].results?.[0] as any)?.count || 0,
      totalOperators: (stats[1].results?.[0] as any)?.count || 0,
      totalEscrowValue: (stats[2].results?.[0] as any)?.total || 0
    });
  }

  // GET /api/profiles/me
  // Fetches current user profile + subscription state
  if (path === '/api/profiles/me' && method === 'GET') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    
    // 1. Fetch profile
    const profile = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(actorId).first() as any;
    
    // 2. Fetch subscription status from the source of truth (active-subscribers table)
    // We check by either actorId OR jwtEmail to be safe
    let subInfo = null;
    if (jwtEmail) {
      subInfo = await env.DB.prepare('SELECT * FROM "active-subscribers" WHERE user_email = ? OR id = ?').bind(jwtEmail.toLowerCase(), actorId).first() as any;
    } else {
      subInfo = await env.DB.prepare('SELECT * FROM "active-subscribers" WHERE id = ?').bind(actorId).first() as any;
    }

    // 3. Return merged data
    if (!profile) {
      return json({ 
        needsSetup: true,
        is_subscriber: subInfo ? 1 : 0,
        subscription_expiry: subInfo?.expiry_date || null,
        subscription_plan: subInfo?.plan_id || null
      });
    }

    return json({
      ...profile,
      is_subscriber: subInfo ? 1 : (profile.is_subscriber || 0),
      subscription_expiry: subInfo?.expiry_date || profile.subscription_expiry,
      subscription_plan: subInfo?.plan_id || profile.subscription_plan
    });
  }

  // PATCH /api/user/me  (called by Account.tsx profile editor)
  // PATCH /api/profiles/me  (alias)
  if ((path === '/api/user/me' || path === '/api/profiles/me') && method === 'PATCH') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    try {
      const body = await request.json() as any;
      const { display_name, username, bio, location, avatar_url, banner_url, social_links, payout_account } = body;

      // If a username/handle is being set, check it isn't already taken by someone else
      if (username) {
        const cleanHandle = username.toLowerCase().replace(/^@/, '');
        const conflict = await env.DB.prepare(
          'SELECT id FROM profiles WHERE handle = ? AND id != ?'
        ).bind(cleanHandle, actorId).first();
        if (conflict) return json({ error: 'Handle already taken' }, 409);
      }

      // email comes from the decoded JWT — required by the NOT NULL constraint
      const emailForInsert = jwtEmail || `${actorId}@unknown.local`;

      await env.DB.prepare(`
        INSERT INTO profiles (id, email, full_name, handle, bio, location, avatar_url, banner_url, aura_tier, aura_points, social_links, payout_account, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'standard', 0, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          full_name      = COALESCE(EXCLUDED.full_name, full_name),
          handle         = COALESCE(EXCLUDED.handle, handle),
          bio            = COALESCE(EXCLUDED.bio, bio),
          location       = COALESCE(EXCLUDED.location, location),
          avatar_url     = COALESCE(EXCLUDED.avatar_url, avatar_url),
          banner_url     = COALESCE(EXCLUDED.banner_url, banner_url),
          social_links   = COALESCE(EXCLUDED.social_links, social_links),
          payout_account = COALESCE(EXCLUDED.payout_account, payout_account),
          updated_at     = CURRENT_TIMESTAMP
      `).bind(
        actorId,
        emailForInsert,
        display_name || null,
        username ? username.toLowerCase().replace(/^@/, '') : null,
        bio || null,
        location || null,
        avatar_url || null,
        banner_url || null,
        social_links ? JSON.stringify(social_links) : null,
        payout_account || null
      ).run();

      const updated = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(actorId).first();
      return json({ success: true, profile: updated });
    } catch (e: any) {
      console.error('[PATCH /api/user/me]', e);
      return json({ error: e.message || 'Update failed' }, 500);
    }
  }

  // GET /api/profiles/handle/:handle (Get full profile or availability)
  const handleCheckMatch = path.match(/^\/api\/profiles\/handle\/([^/]+)$/);
  if (handleCheckMatch && method === 'GET') {
    const handle = handleCheckMatch[1].toLowerCase().replace(/^@/, '');
    const profile = await env.DB.prepare('SELECT p.* FROM profiles p WHERE handle = ?').bind(handle).first() as any;
    
    if (profile) {
      const { results: pulses } = await env.DB.prepare(`
        SELECT p.*, 
        (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'heart') as hearts,
        (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'echo') as echoes,
        (SELECT COUNT(*) FROM pulses WHERE parent_id = p.id) as comments_count,
        (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'heart') as has_hearted,
        (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'echo') as has_echoed
        FROM pulses p 
        WHERE author_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
      `).bind(actorId || '', actorId || '', profile.id).all();

      // Get follow counts
      const counts = await env.DB.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM follows WHERE followed_id = ?) as followers_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count
      `).bind(profile.id, profile.id).first() as any;

      // Check if current user follows this profile
      let isFollowing = false;
      if (actorId && actorId !== profile.id) {
        const follow = await env.DB.prepare('SELECT id FROM follows WHERE follower_id = ? AND followed_id = ?')
          .bind(actorId, profile.id).first();
        isFollowing = !!follow;
      }

      return json({ 
        ...profile,
        available: false,
        pulses: pulses || [],
        followers_count: counts?.followers_count || 0,
        following_count: counts?.following_count || 0,
        isFollowing,
        social_links: typeof profile.social_links === 'string' ? JSON.parse(profile.social_links) : (profile.social_links || {})
      });
    }
    return json({ available: true, handle });
  }

  // POST /api/profiles/handle/claim
  if (path === '/api/profiles/handle/claim' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { handle, fullName, role, bio, social_links } = await request.json() as any;
    const cleanHandle = handle.toLowerCase().replace(/^@/, '');
    
    // Check if handle taken
    const existing = await env.DB.prepare('SELECT id FROM profiles WHERE handle = ?').bind(cleanHandle).first();
    if (existing) return json({ error: 'Handle already claimed' }, 400);

    try {
      await env.DB.prepare(`
        INSERT INTO profiles (id, handle, full_name, primary_role, bio, social_links, aura_tier, aura_points, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'standard', 100, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          handle = EXCLUDED.handle,
          full_name = EXCLUDED.full_name,
          primary_role = EXCLUDED.primary_role,
          bio = COALESCE(EXCLUDED.bio, bio),
          social_links = COALESCE(EXCLUDED.social_links, social_links),
          aura_tier = 'standard',
          aura_points = 100,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        actorId, 
        cleanHandle, 
        fullName || '', 
        role || 'Collector',
        bio || null,
        social_links ? JSON.stringify(social_links) : null
      ).run();
      
      return json({ success: true, handle: cleanHandle });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // GET /api/pulses (The Multi-Vector Feed)
  if (path === '/api/pulses' && method === 'GET') {
    const vector = url.searchParams.get('vector') || 'latest';
    let query = `
      SELECT p.*, pr.handle as author_handle, pr.full_name as author_name, pr.avatar_url as author_avatar, pr.aura_tier as author_tier, pr.is_verified as author_verified,
      (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'heart') as hearts,
      (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'echo') as echoes,
      (SELECT COUNT(*) FROM pulses WHERE parent_id = p.id) as comments_count,
      (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'heart') as has_hearted,
      (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'echo') as has_echoed
      FROM pulses p
      JOIN profiles pr ON p.author_id = pr.id
    `;

    const handleFilter = url.searchParams.get('handle');
    if (handleFilter) {
      query += ` WHERE pr.handle = '${handleFilter.replace(/^@/, '')}'`;
    }

    if (vector === 'trending') {
      query += (handleFilter ? ' AND' : ' WHERE') + ` p.created_at > datetime('now', '-7 days')`;
      query += ` ORDER BY (hearts + echoes * 2) DESC, p.created_at DESC LIMIT 50`;
    } else if (vector === 'marketplace') {
      query += (handleFilter ? ' AND' : ' WHERE') + ` (p.is_marketplace = 1 OR p.type = 'deal') ORDER BY p.created_at DESC LIMIT 50`;
    } else {
      query += ` ORDER BY p.created_at DESC LIMIT 50`;
    }

    const { results } = await env.DB.prepare(query).bind(actorId || '', actorId || '').all();
    return json(results || []);
  }

  // GET /api/pulses/:id
  if (path.startsWith('/api/pulses/') && method === 'GET') {
    const id = path.split('/').pop();
    if (id && id !== 'latest' && id !== 'trending' && id !== 'marketplace') {
        const pulseQuery = `
          SELECT p.*, pr.handle as author_handle, pr.full_name as author_name, pr.avatar_url as author_avatar, pr.is_verified as author_verified,
          (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'heart') as hearts,
          (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'echo') as echoes,
          (SELECT COUNT(*) FROM pulses WHERE parent_id = p.id) as comments_count,
          (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'heart') as has_hearted,
          (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'echo') as has_echoed
          FROM pulses p
          JOIN profiles pr ON p.author_id = pr.id
          WHERE p.id = ?
        `;
        
        const pulse = await env.DB.prepare(pulseQuery).bind(actorId || '', actorId || '', id).first() as any;
        if (!pulse) return json({ error: 'Pulse not found' }, 404);

        const repliesQuery = `
          SELECT p.*, pr.handle as author_handle, pr.full_name as author_name, pr.avatar_url as author_avatar, pr.is_verified as author_verified,
          (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'heart') as hearts,
          (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'echo') as echoes,
          (SELECT COUNT(*) FROM pulses WHERE parent_id = p.id) as comments_count,
          (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'heart') as has_hearted,
          (SELECT id FROM pulse_reactions WHERE pulse_id = p.id AND user_id = ? AND type = 'echo') as has_echoed
          FROM pulses p
          JOIN profiles pr ON p.author_id = pr.id
          WHERE p.parent_id = ?
          ORDER BY p.created_at ASC
        `;
        
        const { results: replies } = await env.DB.prepare(repliesQuery).bind(actorId || '', actorId || '', id).all();
        return json({ pulse, replies });
    }
  }

  if (path === '/api/pulses' && (method === 'POST' || method === 'PUT')) {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { content, media_urls, poll_data, type, is_marketplace, deal_metadata, parent_id } = await request.json() as any;
    const id = crypto.randomUUID();

    try {
      await env.DB.prepare(`
        INSERT INTO pulses (id, author_id, content, media_urls, poll_data, type, is_marketplace, deal_metadata, parent_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        id, 
        actorId, 
        content || null, 
        media_urls ? JSON.stringify(media_urls) : null,
        poll_data ? JSON.stringify(poll_data) : null,
        type || 'text',
        is_marketplace ? 1 : 0,
        deal_metadata ? JSON.stringify(deal_metadata) : null,
        parent_id || null
      ).run();

      // If it's a reply, notify the parent author
      if (parent_id) {
        const parent = await env.DB.prepare('SELECT author_id FROM pulses WHERE id = ?').bind(parent_id).first() as any;
        if (parent && parent.author_id !== actorId) {
          await env.DB.prepare(`
            INSERT INTO notifications (id, user_id, actor_id, type, target_id, content)
            VALUES (?, ?, ?, 'comment', ?, ?)
          `).bind(crypto.randomUUID(), parent.author_id, actorId, parent_id, 'commented on your post').run();
        }
      }

      // Award Aura for activity
      await env.DB.prepare('UPDATE profiles SET aura_points = aura_points + 5 WHERE id = ?').bind(actorId).run();

      return json({ success: true, id });
    } catch (e: any) {
      console.error('[POST /api/pulses]', e);
      return json({ error: e.message }, 500);
    }
  }

  // DELETE /api/pulses/:id
  const pulseMatch = path.match(/^\/api\/pulses\/([^/]+)$/);
  if (pulseMatch && method === 'DELETE') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const id = pulseMatch[1];
    const pulse = await env.DB.prepare('SELECT author_id FROM pulses WHERE id = ?').bind(id).first() as any;
    if (!pulse) return json({ error: 'Pulse not found' }, 404);
    if (pulse.author_id !== actorId) return json({ error: 'Forbidden' }, 403);
    
    await env.DB.prepare('DELETE FROM pulses WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  // PATCH /api/pulses/:id
  if (path.startsWith('/api/pulses/') && method === 'PATCH') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const id = path.split('/').pop();
    const { content, media_urls, poll_data, is_marketplace, deal_metadata } = await request.json() as any;
    
    const pulse = await env.DB.prepare('SELECT author_id FROM pulses WHERE id = ?').bind(id).first() as any;
    if (!pulse) return json({ error: 'Pulse not found' }, 404);
    if (pulse.author_id !== actorId) return json({ error: 'Forbidden' }, 403);

    await env.DB.prepare(`
      UPDATE pulses 
      SET content = COALESCE(?, content),
          media_urls = COALESCE(?, media_urls),
          poll_data = COALESCE(?, poll_data),
          is_marketplace = COALESCE(?, is_marketplace),
          deal_metadata = COALESCE(?, deal_metadata),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      content || null,
      media_urls ? JSON.stringify(media_urls) : null,
      poll_data ? JSON.stringify(poll_data) : null,
      is_marketplace !== undefined ? (is_marketplace ? 1 : 0) : null,
      deal_metadata ? JSON.stringify(deal_metadata) : null,
      id
    ).run();

    return json({ success: true });
  }


  // POST /api/profiles/follow
  if (path === '/api/profiles/follow' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { target_id } = await request.json() as any;
    if (actorId === target_id) return json({ error: 'Cannot follow yourself' }, 400);

    try {
      const existing = await env.DB.prepare('SELECT id FROM follows WHERE follower_id = ? AND followed_id = ?')
        .bind(actorId, target_id).first();

      if (existing) {
        await env.DB.prepare('DELETE FROM follows WHERE id = ?').bind(existing.id).run();
        return json({ success: true, followed: false });
      } else {
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO follows (id, follower_id, followed_id) VALUES (?, ?, ?)')
          .bind(id, actorId, target_id).run();
        
        // Notify target
        await env.DB.prepare(`
          INSERT INTO notifications (id, user_id, actor_id, type, target_id, content)
          VALUES (?, ?, ?, 'follow', ?, ?)
        `).bind(crypto.randomUUID(), target_id, actorId, target_id, 'followed your channel').run();

        return json({ success: true, followed: true });
      }
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // POST /api/pulses/:id/react
  const reactMatch = path.match(/^\/api\/pulses\/([^/]+)\/react$/);
  if (reactMatch && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const pulseId = reactMatch[1];
    const { type } = await request.json() as any; // 'heart' or 'echo'
    const id = crypto.randomUUID();

    try {
      const existing = await env.DB.prepare(`
        SELECT id FROM pulse_reactions WHERE pulse_id = ? AND user_id = ? AND type = ?
      `).bind(pulseId, actorId, type).first();

      if (existing) {
        await env.DB.prepare('DELETE FROM pulse_reactions WHERE id = ?').bind(existing.id).run();
        return json({ success: true, reacted: false });
      } else {
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO pulse_reactions (id, pulse_id, user_id, type)
          VALUES (?, ?, ?, ?)
        `).bind(id, pulseId, actorId, type).run();

        // Notify pulse author
        const pulse = await env.DB.prepare('SELECT author_id, content FROM pulses WHERE id = ?').bind(pulseId).first() as any;
        if (pulse && pulse.author_id !== actorId) {
          await env.DB.prepare(`
            INSERT INTO notifications (id, user_id, actor_id, type, target_id, content)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(), 
            pulse.author_id, 
            actorId, 
            type === 'echo' ? 'echo' : 'reaction', 
            pulseId,
            type === 'echo' ? 'echoed your post' : 'liked your post'
          ).run();
        }

        return json({ success: true, reacted: true });
      }
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // POST /api/escrow/create-deal
  if (path === '/api/escrow/create-deal' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { pulse_id, amount } = await request.json() as any;

    try {
      const pulse = await env.DB.prepare('SELECT author_id, deal_metadata FROM pulses WHERE id = ?').bind(pulse_id).first() as any;
      if (!pulse) return json({ error: 'Post not found' }, 404);

      const dealId = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const fee = Math.floor(amount * 0.07); // 7% platform fee

      await env.DB.prepare(`
        INSERT INTO escrow_deals (id, pulse_id, seller_id, buyer_id, amount, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending_payment', CURRENT_TIMESTAMP)
      `).bind(dealId, pulse_id, pulse.author_id, actorId, amount).run();

      // Notify seller
      await env.DB.prepare(`
        INSERT INTO notifications (id, user_id, actor_id, type, target_id, content)
        VALUES (?, ?, ?, 'escrow_update', ?, ?)
      `).bind(crypto.randomUUID(), pulse.author_id, actorId, dealId, 'initiated a purchase for your item').run();

      return json({ success: true, dealId });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // GET /api/escrow/deals
  if (path === '/api/escrow/deals' && method === 'GET') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const deals = await env.DB.prepare(`
      SELECT d.*, p.content as pulse_content, p.author_handle as seller_handle, p.author_name as seller_name
      FROM escrow_deals d
      JOIN pulses p ON d.pulse_id = p.id
      WHERE d.buyer_id = ? OR d.seller_id = ?
      ORDER BY d.created_at DESC
    `).bind(actorId, actorId).all();
    return json(deals.results || []);
  }

  // PATCH /api/escrow/deals/:id
  if (path.startsWith('/api/escrow/deals/') && method === 'PATCH') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const dealId = path.split('/').pop();
    const { status } = await request.json() as any;

    const deal = await env.DB.prepare('SELECT * FROM escrow_deals WHERE id = ?').bind(dealId).first() as any;
    if (!deal) return json({ error: 'Deal not found' }, 404);

    // Permission matrix
    if (status === 'deposited' && deal.buyer_id !== actorId) return json({ error: 'Only buyer can mark as deposited' }, 403);
    if (status === 'shipped' && deal.seller_id !== actorId) return json({ error: 'Only seller can mark as shipped' }, 403);
    if (status === 'completed' && deal.buyer_id !== actorId) return json({ error: 'Only buyer can confirm receipt' }, 403);

    await env.DB.prepare('UPDATE escrow_deals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, dealId).run();

    const targetId = (actorId === deal.buyer_id) ? deal.seller_id : deal.buyer_id;
    await env.DB.prepare(`
      INSERT INTO notifications (id, user_id, actor_id, type, target_id, content)
      VALUES (?, ?, ?, 'escrow_update', ?, ?)
    `).bind(crypto.randomUUID(), targetId, actorId, dealId, `Deal status updated to ${status}`).run();

    return json({ success: true, status });
  }

  // GET /api/notifications
  if (path === '/api/notifications' && method === 'GET') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { results } = await env.DB.prepare(`
      SELECT n.*, p.full_name as actor_name, p.avatar_url as actor_avatar
      FROM notifications n
      LEFT JOIN profiles p ON n.actor_id = p.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC LIMIT 50
    `).bind(actorId).all();
    return json(results || []);
  }

  // GET /api/notifications/unread
  if (path === '/api/notifications/unread' && method === 'GET') {
    if (!actorId) return json({ unread: 0 });
    const count = await env.DB.prepare(`
      SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0
    `).bind(actorId).first() as any;
    return json({ unread: count?.unread || 0 });
  }

  // ─── SECONDARY FEATURE ENDPOINTS ───────────────────────────────────────────

  // GET /api[/admin]/profiles/:userId/scorecard
  if (path.match(/^\/api\/(admin\/)?profiles\/[^/]+\/scorecard$/) && method === 'GET') {
    const segments = path.split('/');
    const userId = segments[segments.length - 2];
    const stats = await env.DB.prepare(`
      SELECT 
        id, full_name, handle, avatar_url, aura_tier, aura_points, 
        is_verified, completed_trades, strikes, location, primary_role, created_at,
        (SELECT COUNT(*) FROM community_vouches WHERE vouchee_id = profiles.id) as vouch_count
      FROM profiles 
      WHERE id = ? OR handle = ?
    `).bind(userId, userId).first() as any;

    if (!stats) return json({ error: 'Profile not found' }, 404);

    const badges = await env.DB.prepare(`
      SELECT badge_type FROM seller_badges WHERE user_id = ?
    `).bind(stats.id).all();

    return json({
      ...stats,
      badges: (badges.results || []).map((b: any) => b.badge_type),
      verification_status: stats.is_verified ? 'verified' : 'none'
    });
  }

  // GET /api[/admin]/user/wishlist
  if ((path === '/api/user/wishlist' || path === '/api/admin/user/wishlist') && method === 'GET') {
    if (!actorId) return json([]);
    const { results } = await env.DB.prepare(`
      SELECT * FROM wishlist WHERE user_id = ? ORDER BY created_at DESC
    `).bind(actorId).all();
    return json(results || []);
  }

  // POST /api/wishlist (Toggle)
  if (path === '/api/wishlist' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { target_id, target_type } = await request.json() as any;
    const existing = await env.DB.prepare('SELECT id FROM wishlist WHERE user_id = ? AND target_id = ?').bind(actorId, target_id).first();
    
    if (existing) {
      await env.DB.prepare('DELETE FROM wishlist WHERE id = ?').bind(existing.id).run();
      return json({ success: true, added: false });
    } else {
      await env.DB.prepare('INSERT INTO wishlist (id, user_id, target_id, target_type) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), actorId, target_id, target_type).run();
      return json({ success: true, added: true });
    }
  }

  // GET /api[/admin]/mixtape_comments
  if ((path === '/api/mixtape_comments' || path === '/api/admin/mixtape_comments') && method === 'GET') {
    const mixtapeId = url.searchParams.get('mixtape_id');
    let query = `
      SELECT c.*, p.full_name as author_name, p.avatar_url as author_avatar, p.handle as author_handle
      FROM mixtape_comments c
      JOIN profiles p ON c.author_id = p.id
    `;
    let params: any[] = [];
    if (mixtapeId) {
      query += ' WHERE c.mixtape_id = ?';
      params.push(mixtapeId);
    }
    query += ' ORDER BY c.created_at DESC';
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json(results || []);
  }

  // POST /api/mixtape_comments
  if (path === '/api/mixtape_comments' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { mixtape_id, content } = await request.json() as any;
    await env.DB.prepare('INSERT INTO mixtape_comments (id, mixtape_id, author_id, content) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), mixtape_id, actorId, content).run();
    return json({ success: true });
  }

  // GET /api[/admin]/support/tickets
  if ((path === '/api/support/tickets' || path === '/api/admin/support/tickets') && method === 'GET') {
    if (!actorId) return json([]);
    const isAdmin = jwtEmail && ADMIN_EMAILS.includes(jwtEmail.toLowerCase());
    let query = 'SELECT * FROM support_tickets';
    let params: any[] = [];
    if (!isAdmin) {
      query += ' WHERE user_id = ?';
      params.push(actorId);
    }
    query += ' ORDER BY created_at DESC';
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json(results || []);
  }

  // GET /api[/admin]/installments
  if ((path === '/api/installments' || path === '/api/admin/installments') && method === 'GET') {
    if (!actorId) return json([]);
    const isAdmin = jwtEmail && ADMIN_EMAILS.includes(jwtEmail.toLowerCase());
    let query = 'SELECT * FROM installment_plans';
    let params: any[] = [];
    if (!isAdmin) {
      query += ' WHERE user_id = ?';
      params.push(actorId);
    }
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json(results || []);
  }

  // GET /api[/admin]/pool/sync-notifications
  if ((path === '/api/pool/sync-notifications' || path === '/api/admin/pool/sync-notifications') && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM sync_notifications ORDER BY created_at DESC LIMIT 5').all();
    return json(results || []);
  }

  // POST /api/profiles/contact/send-otp (Instant OTP for Email/Phone/WhatsApp)
  if (path === '/api/profiles/contact/send-otp' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { method: contactMethod, contact } = await request.json() as any;
    if (!contactMethod || !contact) return json({ error: 'Method and contact required' }, 400);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    await env.DB.prepare(`
      UPDATE profiles SET 
        otp_code = ?,
        otp_expiry = ?,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(otp, expiry, actorId).run();

    return json({ success: true, simulated_otp: otp, message: `OTP sent to your ${contactMethod}.` });
  }

  // POST /api/profiles/contact/verify-otp
  if (path === '/api/profiles/contact/verify-otp' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { otp_code } = await request.json() as any;
    
    const profile = await env.DB.prepare('SELECT otp_code, otp_expiry FROM profiles WHERE id = ?').bind(actorId).first() as any;
    if (!profile) return json({ error: 'Profile not found' }, 404);
    
    const now = new Date().toISOString();
    if (!profile.otp_expiry || now > profile.otp_expiry) return json({ error: 'OTP expired' }, 410);
    if (String(profile.otp_code) !== String(otp_code)) return json({ error: 'Invalid code' }, 400);

    // Mark contact as verified (we'll use a specific status for this)
    await env.DB.prepare(`
      UPDATE profiles SET 
        verification_status = 'contact_verified',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(actorId).run();

    return json({ success: true, message: 'Contact details verified!' });
  }

  // POST /api/profiles/request-badge (Only once eligible)
  if (path === '/api/profiles/request-badge' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    
    const profile = await env.DB.prepare('SELECT verification_status, bio, avatar_url, location, is_verified FROM profiles WHERE id = ?').bind(actorId).first() as any;
    
    if (profile.verification_status !== 'contact_verified' && !profile.is_verified) {
      return json({ error: 'Verify your contact details first' }, 403);
    }
    
    if (!profile.bio || !profile.location || !profile.avatar_url) {
      return json({ error: 'Complete your profile details first' }, 403);
    }

    await env.DB.prepare(`
      UPDATE profiles SET 
        verification_status = 'requested',
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(actorId).run();
    
    return json({ success: true, message: 'Identity badge request submitted.' });
  }

  // ALIAS: GET /api/community/posts -> /api/pulses
  if (path === '/api/community/posts' || path === '/api/admin/community/posts') {
    const targetUrl = new URL(request.url);
    targetUrl.pathname = '/api/pulses';
    return handleRequest(new Request(targetUrl, request), env, ctx);
  }

  // ─── Scraped Tracks (Music Pool Intake) ───────────────────────────────────────
  
  // GET /api/admin/scraped-tracks
  if (path === '/api/admin/scraped-tracks' && method === 'GET') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Unauthorized' }, 401);
    const { results } = await env.DB.prepare("SELECT * FROM scraped_tracks WHERE status != 'approved' ORDER BY scraped_at DESC").all();
    return json(results || []);
  }

  // POST /api/admin/scraped-tracks/scan
  if (path === '/api/admin/scraped-tracks/scan' && method === 'POST') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Unauthorized' }, 401);
    // Stub
    return json({ success: true, new_tracks: 0 });
  }

  // POST /api/admin/scraped-tracks/check-duplicates
  if (path === '/api/admin/scraped-tracks/check-duplicates' && method === 'POST') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Unauthorized' }, 401);
    return json({ success: true, duplicates: [] });
  }

  // POST /api/admin/scraped-tracks/approve
  if (path === '/api/admin/scraped-tracks/approve' && method === 'POST') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Unauthorized' }, 401);
    try {
      const { ids } = await request.json() as any;
      if (!ids || !ids.length) return json({ error: 'No IDs provided' }, 400);

      const stmt = env.DB.prepare("UPDATE scraped_tracks SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?");
      const batch = ids.map((id: string) => stmt.bind(id));
      await env.DB.batch(batch);
      
      return json({ success: true, approved: ids.length });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // PATCH /api/admin/scraped-tracks/:id
  const scrapedTracksPatchMatch = path.match(/^\/api\/admin\/scraped-tracks\/([^/]+)$/);
  if (scrapedTracksPatchMatch && method === 'PATCH') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Unauthorized' }, 401);
    const id = scrapedTracksPatchMatch[1];
    
    try {
      const data = await request.json() as any;
      const fields = ['title', 'artist', 'genre', 'bpm', 'key_signature', 'duration', 'status'].filter(k => data[k] !== undefined);
      if (!fields.length) return json({ success: true });

      const setClauses = fields.map(k => `${k} = ?`).join(', ');
      const values = fields.map(k => data[k]);
      values.push(id);

      await env.DB.prepare(`UPDATE scraped_tracks SET ${setClauses} WHERE id = ?`).bind(...values).run();
      return json({ success: true });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // DELETE /api/admin/scraped-tracks/:id
  if (scrapedTracksPatchMatch && method === 'DELETE') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Unauthorized' }, 401);
    const id = scrapedTracksPatchMatch[1];
    await env.DB.prepare('DELETE FROM scraped_tracks WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  // ─── Music Pool (Standard & External Hubs) ───────────────────────────────────

  // GET /api/pool/filters
  if (path === '/api/pool/filters' && method === 'GET') {
    try {
      const db_results = await env.DB.batch([
        env.DB.prepare("SELECT DISTINCT collection_hub FROM tracks WHERE is_active = 1"),
        env.DB.prepare("SELECT DISTINCT genre FROM tracks WHERE is_active = 1 AND genre IS NOT NULL"),
        env.DB.prepare("SELECT DISTINCT release_year FROM tracks WHERE is_active = 1 AND release_year IS NOT NULL ORDER BY release_year DESC"),
        env.DB.prepare("SELECT DISTINCT release_month FROM tracks WHERE is_active = 1 AND release_month IS NOT NULL")
      ]);

      const hubs = (db_results[0].results as any[]).map(r => r.collection_hub).filter(Boolean);
      const genres = (db_results[1].results as any[]).map(r => r.genre).filter(Boolean);
      const years = (db_results[2].results as any[]).map(r => r.release_year).filter(Boolean);
      const months = (db_results[3].results as any[]).map(r => r.release_month).filter(Boolean);

      // Construct hubsWithGenres (Simple mapping for now)
      const hubsWithGenres = hubs.map(h => ({
        hub: h,
        genres: genres // For now return all genres for each hub, or refine if needed
      }));

      // Group years with months
      const yearsWithMonths = years.map(y => ({
        year: y,
        months: months
      }));

      return json({
        hubsWithGenres,
        years: yearsWithMonths,
        genres,
        hubs,
        months
      });
    } catch (e: any) {
      return json({ error: e.message, stack: e.stack }, 500);
    }
  }

  // GET /api/pool/tracks
  if (path === '/api/pool/tracks' && method === 'GET') {
    try {
      // 1. Subscription check (Gated content)
      let isAuthorized = false;
      const safeEmail = (jwtEmail || '').toLowerCase();
      
      if (actorId || safeEmail) {
        const sub = await env.DB.prepare('SELECT status, expiry_date FROM "active-subscribers" WHERE user_email = ? OR id = ?').bind(safeEmail, actorId).first() as any;
        const isExpired = sub && sub.expiry_date && new Date(sub.expiry_date) < new Date();
        const isActiveSub = sub && sub.status === 'active' && !isExpired;
        const isAdm = safeEmail && ADMIN_EMAILS.includes(safeEmail);
        
        if (isActiveSub || isAdm) {
          isAuthorized = true;
        }
      }

      // 2. Query construction
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      const hub = url.searchParams.get('hub');
      const genre = url.searchParams.get('genre');
      const year = url.searchParams.get('year');
      const month = url.searchParams.get('month');
      const search = url.searchParams.get('search');

      let baseCriteria = "WHERE is_active = 1";
      const params: any[] = [];

      if (hub && hub !== 'all') { baseCriteria += " AND collection_hub = ?"; params.push(hub); }
      if (genre && genre !== 'All') { baseCriteria += " AND genre = ?"; params.push(genre); }
      if (year && year !== 'All') { baseCriteria += " AND release_year = ?"; params.push(parseInt(year)); }
      if (month && month !== 'All') { baseCriteria += " AND release_month = ?"; params.push(month); }
      if (search) {
        baseCriteria += " AND (title LIKE ? OR artist LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }

      // Get total count for pagination
      const totalResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM tracks ${baseCriteria}`).bind(...params).first() as any;
      const totalRecords = totalResult?.total || 0;

      // Apply limit/offset and Join
      const dataQuery = `
        SELECT t.*, v.versions
        FROM tracks t
        LEFT JOIN (
          SELECT track_id, json_group_array(json_object(
            'id', id,
            'version_name', version_name,
            'file_url', file_url,
            'file_size', file_size,
            'preview_url', file_url
          )) as versions
          FROM track_versions
          GROUP BY track_id
        ) v ON t.id = v.track_id
        WHERE t.id IN (
          SELECT id FROM tracks
          ${baseCriteria}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        )
        ORDER BY t.created_at DESC
      `;
      
      const dataParams = [...params, limit, offset];
      const { results } = await env.DB.prepare(dataQuery).bind(...dataParams).all();

      const tracks = (results || []).map((t: any) => ({
        ...t,
        versions: typeof t.versions === 'string' ? JSON.parse(t.versions) : (t.versions || [])
      }));

      if (!isAuthorized) {
        return json({ 
          error: 'Forbidden: Subscription required', 
          isAuthorized: false,
          tracks: [] 
        }, 403);
      }

      return json({
        tracks,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit)
        },
        isAuthorized: true
      });
    } catch (e: any) {
      return json({ error: e.message, stack: e.stack }, 500);
    }
  }

  // GET /api/admin/pool/tracks (Admin restricted)
  if (path === '/api/admin/pool/tracks' && method === 'GET') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Unauthorized' }, 401);
    
    const { results } = await env.DB.prepare(`
      SELECT t.*, v.versions
      FROM tracks t
      LEFT JOIN (
        SELECT track_id, json_group_array(json_object(
          'id', id,
          'version_name', version_name,
          'file_url', file_url,
          'file_size', file_size,
          'preview_url', preview_url
        )) as versions
        FROM track_versions
        GROUP BY track_id
      ) v ON t.id = v.track_id
      ORDER BY t.created_at DESC
      LIMIT 1000
    `).all();

    const tracks = (results || []).map((t: any) => ({
      ...t,
      versions: typeof t.versions === 'string' ? JSON.parse(t.versions) : (t.versions || [])
    }));

    return json(tracks);
  }

  // ─── Commerce Routes ──────────────────────────────────────────────────────────


  if ((path === '/api/products' || path === '/api/v1/products') && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM products WHERE status = 'active' OR is_active = 1 ORDER BY created_at DESC`
    ).all();
    const mapped = (results || []).map((p: any) => ({
      ...p,
      image_url: normalizeAssetUrl(p.image_url || p.image),
      imageUrl: normalizeAssetUrl(p.image_url || p.image),
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
      features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []),
      shipping_tier: p.shipping_tier || p.shippingTier || 'local',
      shippingTier: p.shipping_tier || p.shippingTier || 'local',
      category_name: p.category_name || p.category || 'Music'
    }));
    return json(mapped);
  }

  // GET /api/coupons/validate
  if (path === '/api/coupons/validate' && method === 'GET') {
    const code = url.searchParams.get('code');
    if (!code) return json({ error: 'Coupon code required' }, 400);

    const coupon = await env.DB.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').bind(code).first() as any;
    if (!coupon) return json({ error: 'Invalid or expired coupon' }, 404);

    // Basic expiry check if valid_until exists
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return json({ error: 'Coupon has expired' }, 400);
    }

    return json({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0
    });
  }

  if (path === '/api/mixtapes' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM mixtapes ORDER BY created_at DESC`
    ).all();
    const mapped = (results || []).map((m: any) => ({
      ...m,
      coverUrl: normalizeAssetUrl(m.cover_url),
      audioUrl: normalizeAssetUrl(m.audio_url),
      downloadUrl: normalizeAssetUrl(m.download_url)
    }));
    return json(mapped);
  }

  // ─── Monetization & Store ───────────────────────────────────────────────────

  // POST /api/payments/initialize
  if (path === '/api/payments/initialize' && method === 'POST') {
    try {
      const data = await request.json() as any;
      const { type, amount, email, metadata } = data;
      
      const appUrl = (env.VITE_APP_URL || 'https://djflowerz.co.ke').replace(/\/$/, '');
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(amount) * 100), // convert to kobo (input should be KES)
          metadata: {
            ...metadata,
            payment_type: type
          },
          callback_url: `${appUrl}/api/payments/verify`
        })
      });
      
      const resData = await response.json() as any;
      if (!resData.status) throw new Error(resData.message || 'Paystack initialization failed');
      
      return json(resData.data);
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // POST /api/payments/verify
  if (path === '/api/payments/verify' && method === 'POST') {
    try {
      const { reference } = await request.json() as any;
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { 'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}` }
      });
      const resData = await response.json() as any;
      return json(resData.data);
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // POST /api/orders (Successor to /api/checkout)
  if ((path === '/api/orders' || path === '/api/checkout') && method === 'POST') {
    try {
      const data = await request.json() as any;
      const orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const { items, total_amount, total, customer_email, customer_name, payment_type, installments_count, customer_id, email: fallbackEmail, name: fallbackName, customer } = data;
      
      const finalTotal = total_amount || total || 0;
      const email = customer_email || fallbackEmail || customer?.email || '';
      const name = customer_name || fallbackName || customer?.name || 'Customer';

      let chargeAmount = finalTotal;
      const isLipa = payment_type === 'lipa_pole_pole';
      const depositAmount = finalTotal * 0.20;

      if (isLipa) {
         chargeAmount = depositAmount;
      }

      const appUrl = (env.VITE_APP_URL || 'https://djflowerz.co.ke').replace(/\/$/, '');
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          amount: Math.round(Number(chargeAmount) * 100),
          reference: orderId,
          metadata: {
            order_id: orderId,
            payment_type: isLipa ? 'installment_deposit' : 'order_payment',
            user_id: customer_id || ''
          },
          callback_url: `${appUrl}/checkout`
        })
      });

      const resData = await response.json() as any;
      if (!resData.status) throw new Error(resData.message || 'Paystack initialization failed');

      // Persist order
      await env.DB.prepare(`
        INSERT INTO orders (id, customer_email, customer_name, total_amount, items, status, payment_status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', 'unpaid', datetime('now'))
      `).bind(orderId, email, name, finalTotal, JSON.stringify(items)).run();

      // Persist installment plan if Lipa Pole Pole
      if (isLipa) {
         const planId = crypto.randomUUID();
         const firstItem = items && items[0] ? items[0] : {};
         await env.DB.prepare(`
           INSERT INTO installment_plans (
             id, order_id, user_id, product_id, product_name, total_amount, deposit_amount, balance, status, installments_count, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_deposit', ?, datetime('now'), datetime('now'))
         `).bind(
           planId, orderId, customer_id || '', firstItem.product_id || '', firstItem.product_name || firstItem.name || 'Store Order', 
           finalTotal, depositAmount, finalTotal, installments_count || 3
         ).run();
      }
      
      return json({ 
        orderId, 
        success: true,
        authorizationUrl: resData.data.authorization_url 
      });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // GET /api/orders/:id
  const orderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
  if (orderMatch && method === 'GET') {
    const id = orderMatch[1];
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!order) return json({ error: 'Order not found' }, 404);
    return json(order);
  }

  // POST /api/paystack/webhook
  if (path === '/api/paystack/webhook' && method === 'POST') {
    // Basic verification logic would go here
    const event = await request.json() as any;
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      if (metadata.payment_type === 'subscription') {
        const userId = metadata.user_id;
        const planId = metadata.plan_id;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        
        await env.DB.prepare(`
          INSERT INTO subscriptions (id, plan_id, status, expires_at)
          VALUES (?, ?, 'active', ?)
          ON CONFLICT(id) DO UPDATE SET status='active', expires_at=?, plan_id=?
        `).bind(userId, planId, expiry.toISOString(), expiry.toISOString(), planId).run();
      }
    }
    return json({ received: true });
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

    const ADMIN_EMAILS = [
      (env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com').toLowerCase(),
      'djflowerz254@gmail.com'
    ];
    
    // Strict email enforcement — redirect non-admins with 403
    // GET /api/admin/governance/queue
    if (path === '/api/admin/governance/queue' && method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT id, handle, full_name, aura_tier, is_verified, created_at 
        FROM profiles 
        WHERE is_verified = 0 AND handle IS NOT NULL
        ORDER BY created_at ASC
      `).all();
      return json(results || []);
    }

    // PATCH /api/admin/governance/operators/:id (Modulate Operator)
    const operatorMatch = path.match(/^\/api\/admin\/governance\/operators\/([^/]+)$/);
    if (operatorMatch && method === 'PATCH') {
      const id = operatorMatch[1];
      const { aura_tier, is_verified, primary_role } = await request.json() as any;
      
      await env.DB.prepare(`
        UPDATE profiles SET 
          aura_tier = COALESCE(?, aura_tier),
          is_verified = COALESCE(?, is_verified),
          primary_role = COALESCE(?, primary_role),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(aura_tier || null, is_verified !== undefined ? is_verified : null, primary_role || null, id).run();
      
      return json({ success: true });
    }


    // GET /api/admin/dashboard
    if (path === '/api/admin/dashboard' && method === 'GET') {
      try {
        const stats = await env.DB.batch([
          env.DB.prepare('SELECT SUM(amount_kes) as total FROM payments WHERE status = "success" OR status = "paid"'),
          env.DB.prepare('SELECT COUNT(*) as count FROM orders'),
          env.DB.prepare('SELECT COUNT(*) as count FROM mixtapes WHERE status = "published"'),
          env.DB.prepare('SELECT SUM(amount) as total FROM tips WHERE status = "success" OR status = "completed"'),

          env.DB.prepare('SELECT * FROM payments ORDER BY created_at DESC LIMIT 5'),
          env.DB.prepare('SELECT * FROM tips ORDER BY created_at DESC LIMIT 5')
        ]);

        const totalRevenue = ((stats[0].results?.[0] as any)?.total || 0) + ((stats[3].results?.[0] as any)?.total || 0);
        
        const recentPayments = (stats[4].results || []).map((p: any) => ({
          id: p.id,
          type: 'payment',
          email: p.customer_email,
          amount: p.amount_kes || 0,
          status: p.status,
          createdAt: p.created_at
        }));

        const recentTips = (stats[5].results || []).map((t: any) => ({
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
          totalTips: (stats[3].results?.[0] as any)?.total || 0, // Fix: use index 0 and .total instead of .count
          recentActivity
        });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
    }


    // PUT /api/admin/store/settings
    if (path === '/api/admin/store/settings' && method === 'PUT') {
      try {
        const data = await request.json() as any;
        const payload = JSON.stringify(data);
        
        // 1. Update store settings KV
        await env.KV.put('store_settings', payload);

        // 2. Cross-sync to site_config for shared fields (socials, contacts)
        const currentSiteConfigStr = await env.KV.get('site_config');
        const currentSiteConfig = currentSiteConfigStr ? JSON.parse(currentSiteConfigStr) : {};

        const updatedSiteConfig = {
          ...currentSiteConfig,
          socials: { ...(currentSiteConfig.socials || {}), ...(data.socials || {}) },
          contact: { 
             ...(currentSiteConfig.contact || {}), 
             email: data.contacts?.email || currentSiteConfig.contact?.email,
             phone: data.contacts?.phone || currentSiteConfig.contact?.phone,
             address: data.contacts?.address || currentSiteConfig.contact?.address,
             whatsapp: data.socials?.whatsapp || currentSiteConfig.contact?.whatsapp
          },
          hero: {
            ...(currentSiteConfig.hero || {}),
            title: data.heroTitle || currentSiteConfig.hero?.title,
            subtitle: data.heroSubtitle || currentSiteConfig.hero?.subtitle,
            bgImage: data.heroImage || currentSiteConfig.hero?.bgImage,
            ctaText: data.ctaText || currentSiteConfig.hero?.ctaText
          }
        };
        await env.KV.put('site_config', JSON.stringify(updatedSiteConfig));

        return json({ success: true, message: 'Settings updated successfully' });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
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
        // Match both possible DB column names and UI expectations
        image_url: normalizeAssetUrl(p.image_url || p.image),
        imageUrl: normalizeAssetUrl(p.image_url || p.image),
        images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
        features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []),
        shipping_tier: p.shipping_tier || p.shippingTier || 'local',
        shippingTier: p.shipping_tier || p.shippingTier || 'local',
        category_name: p.category_name || p.category || 'Music',
        variants: variants.filter((v: any) => v.product_id === p.id).map((v: any) => ({
          ...v,
          image_url: normalizeAssetUrl(v.image_url),
          imageUrl: normalizeAssetUrl(v.image_url)
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


    // GET /api/admin/notifications
    if (path === '/api/admin/notifications' && method === 'GET') {
      return json([]); // Placeholder for now
    }

    // POST /api/admin/r2-sync
    if (path === '/api/admin/r2-sync' && method === 'POST') {
      return json({ success: true, message: 'Sync triggered' });
    }

    // [DELETED FROM HERE - MOVED TO PUBLIC AUTH SECTION BELOW]

    // GET /api/admin/system/health
    if (path === '/api/admin/system/health' && method === 'GET') {
      const stats = await env.DB.batch([
        env.DB.prepare('SELECT SUM(amount) as total_escrow FROM escrow_deals WHERE status != "completed"'),
        env.DB.prepare('SELECT COUNT(*) as active_deals FROM escrow_deals WHERE status != "completed"'),
        env.DB.prepare('SELECT COUNT(*) as dispute_count FROM escrow_deals WHERE status = "disputed"')
      ]);
      return json({ 
        reconciliation: {
            total_escrow_held: (stats[0].results?.[0] as any)?.total_escrow || 0,
            active_deals_count: (stats[1].results?.[0] as any)?.active_deals || 0,
            total_fees_collected: 0, // Logic for fees can be added later
        },
        audit_logs: [
            { id: '1', action_type: 'SYSTEM_SYNC', details: 'Database consistency check passed.', created_at: new Date().toISOString() }
        ]
      });
    }

    // Admin Escrow Endpoints
    if (path === '/api/admin/escrow/payout-queue' && method === 'GET') {
        const { results } = await env.DB.prepare(`
            SELECT d.*, p.full_name, pr.m_pesa_number 
            FROM escrow_deals d
            JOIN profiles p ON d.seller_id = p.id
            JOIN profiles pr ON d.seller_id = pr.id
            WHERE d.status = 'completed'
        `).all();
        return json({ payouts: results || [] });
    }

    if (path === '/api/admin/escrow/disputes' && method === 'GET') {
        const { results } = await env.DB.prepare(`
            SELECT d.*, b.full_name as buyer_name, s.full_name as seller_name
            FROM escrow_deals d
            JOIN profiles b ON d.buyer_id = b.id
            JOIN profiles s ON d.seller_id = s.id
            WHERE d.status = 'disputed'
        `).all();
        return json({ disputes: results || [] });
    }

    if (path.includes('/adjudicate') && method === 'POST') {
        const dealId = path.split('/')[4];
        const { outcome, notes } = await request.json() as any;
        const newStatus = outcome === 'release' ? 'completed' : 'refunded';
        await env.DB.prepare('UPDATE escrow_deals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(newStatus, dealId).run();
        return json({ success: true, status: newStatus });
    }

    // GET /api/admin/stats
    if (path === '/api/admin/stats' && method === 'GET') {
      const stats = await env.DB.batch([
        env.DB.prepare('SELECT SUM(amount) as total FROM payments WHERE status = "success" OR status = "paid"'),
        env.DB.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at > DATETIME("now", "-30 days")'),
        env.DB.prepare('SELECT SUM(total) as total FROM orders WHERE status = "completed" OR status = "shipped"')
      ]);
      return json({
        total_revenue: ((stats[0].results?.[0] as any)?.total || 0) + ((stats[2].results?.[0] as any)?.total || 0),
        monthly_sales_count: (stats[1].results?.[0] as any)?.count || 0
      });
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

    // GET /api/admin/profiles (New endpoint for the dashboard)
    if (path === '/api/admin/profiles' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, handle, full_name, email, avatar_url, bio, location, aura_tier, aura_points, is_verified, verification_status, otp_code, presence_status, last_seen, created_at FROM profiles ORDER BY created_at DESC').all();
      return json(results);
    }

    // POST /api/admin/profiles/:id/revoke-verification
    const revokeMatch = path.match(/^\/api\/admin\/profiles\/([^/]+)\/revoke-verification$/);
    if (revokeMatch && method === 'POST') {
      if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
      const targetId = revokeMatch[1];
      await env.DB.prepare(`
        UPDATE profiles SET 
          is_verified = 0,
          verification_status = NULL,
          otp_code = NULL,
          otp_expiry = NULL,
          is_eligible = 0
        WHERE id = ?
      `).bind(targetId).run();
      return json({ success: true });
    }

    // DELETE /api/admin/profiles/:id
    if (path.startsWith('/api/admin/profiles/') && method === 'DELETE') {
      const id = path.split('/').pop();
      if (!id) return json({ error: 'ID required' }, 400);
      
      await env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(id).run();
      // Also cleanup associated data if necessary, though D1 CASCADE usually handles it
      return json({ success: true });
    }

    // POST /api/admin/sync-paystack (Stub)
  }

  // GET /api/user/status
    if (path === '/api/user/status' && method === 'GET') {
      if (!actorId) return json({ authenticated: false });
      return json({ authenticated: true, userId: actorId });
    }

    // GET /api/session_types
    if (path === '/api/session_types' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM session_types WHERE is_active = 1').all();
      return json(results || []);
    }

    // GET /api/plans
    if (path === '/api/plans' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM subscription_plans WHERE is_active = 1').all();
      return json(results || []);
    }

    // GET /api/studio/gear
    if (path === '/api/studio/gear' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM studio_gear WHERE status = "active"').all();
      return json(results || []);
    }

    // POST /api/newsletter/subscribe
    if (path === '/api/newsletter/subscribe' && method === 'POST') {
      try {
        const { email, name = '', source = 'Website' } = await request.json() as any;
        if (!email) return json({ error: 'Email required' }, 400);

        // Standardize email
        const cleanEmail = email.trim().toLowerCase();

        await env.DB.prepare(`
          INSERT INTO newsletter_subscribers (id, email, name, source, status, created_at)
          VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
          ON CONFLICT(email) DO UPDATE SET 
            status = 'active', 
            name = COALESCE(NULLIF(?, ''), name),
            updated_at = CURRENT_TIMESTAMP
        `).bind(crypto.randomUUID(), cleanEmail, name, source, name).run();

        return json({ success: true, message: 'Subscribed successfully' });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
    }

    // POST /api/presence
    if (path === '/api/presence' && method === 'POST') {
      if (actorId) {
        await env.DB.prepare("UPDATE profiles SET last_seen = CURRENT_TIMESTAMP, presence_status = 'online' WHERE id = ?").bind(actorId).run();
      }
      return json({ success: true });
    }

  // ─── Chat Endpoints ───────────────────────────────────────────────────────────

  // Ensure chat tables exist (run on every cold start — idempotent)
  const ensureChatTables = async () => {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        visitor_name TEXT,
        visitor_email TEXT,
        status TEXT DEFAULT 'bot',
        ticket_number TEXT,
        last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`),
    ]);
  };

  // POST /api/chat/start — create or resume a chat session
  if (path === '/api/chat/start' && method === 'POST') {
    try {
      await ensureChatTables();
      const { name, email } = await request.json() as any;
      const sessionId = crypto.randomUUID();
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

      await env.DB.prepare(`
        INSERT INTO chat_sessions (id, visitor_name, visitor_email, status, ticket_number)
        VALUES (?, ?, ?, 'bot', ?)
      `).bind(sessionId, name || 'Visitor', email || null, ticketNumber).run();

      // Insert a welcome message from the bot
      const welcome = `👋 Hey ${name || 'there'}! Welcome to the **DJ Flowerz Hub**. I'm your AI assistant — here to help with anything from bookings, the Music Pool, store orders, or general questions. What can I help you with today?`;
      await env.DB.prepare(`INSERT INTO chat_messages (session_id, sender, text) VALUES (?, 'bot', ?)`).bind(sessionId, welcome).run();

      return json({ success: true, sessionId, ticketNumber });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

    // GET /api/chat/session/:id — poll for messages
    if (method === 'GET' && path.startsWith('/api/chat/session/')) {
      try {
        await ensureChatTables();
        const sessionId = path.replace('/api/chat/session/', '').split('?')[0];
        const url = new URL(request.url);
        const since = url.searchParams.get('since');

        const session = await env.DB.prepare('SELECT * FROM chat_sessions WHERE id = ?').bind(sessionId).first();
        if (!session) return json({ error: 'Session not found' }, 404);

        let messagesQuery = since
          ? env.DB.prepare('SELECT * FROM chat_messages WHERE session_id = ? AND created_at > ? ORDER BY id ASC').bind(sessionId, since)
          : env.DB.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC').bind(sessionId);

        const { results: messages } = await messagesQuery.all();
        return json({ session, messages });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
    }

    // POST /api/chat/message — send a message and get a bot reply
    if (path === '/api/chat/message' && method === 'POST') {
      try {
        await ensureChatTables();
        const { sessionId, text } = await request.json() as any;
        if (!sessionId || !text) return json({ error: 'sessionId and text are required' }, 400);

        // Save the user's message
        await env.DB.prepare(`INSERT INTO chat_messages (session_id, sender, text) VALUES (?, 'user', ?)`).bind(sessionId, text).run();

        // --- AI Bot Response Logic ---
        const lowerText = text.toLowerCase();

        // Site knowledge base
        const botReply = (() => {
          if (lowerText.includes('buy') || lowerText.includes('sell') || lowerText.includes('marketplace') || lowerText.includes('gear') || lowerText.includes('equipment')) {
            return `🛍️ In the **DJ Flowerz Marketplace**, you can buy and sell DJ gear safely using our **Escrow Protection**. 

• **How to Buy**: Click "Buy Now" on any marketplace post. Your payment (M-Pesa/Card) is held by us and only released to the seller after you receive and confirm the item.
• **Safe Trading**: Look for vendors with the **Verified Member** badge 🛡️. 
• **Selling**: Post your gear in the Community Hub and toggle "Marketplace Item" to enable secure checkout.

Visit **djflowerz.co.ke/community** to see what's for sale.`;
          }
          if (lowerText.includes('escrow') || lowerText.includes('trust') || lowerText.includes('verify') || lowerText.includes('safe') || lowerText.includes('scam')) {
            return `🛡️ **Trust & Safety is our priority.** To prevent scams, we use:

• **Escrow**: We hold payments until the trade is completed. Never pay sellers directly via WhatsApp!
• **Verification Badge**: Sellers can get verified by completing their profile and requesting an admin review.
• **Strike System**: We monitor reports and keywords. Rule-breakers get strikes or permanent bans.
• **Seller Scorecard**: View a seller's trade volume and average rating on their profile.

If you suspect a scam, use the **Report Post** button or email **safe@djflowerz.co.ke**.`;
          }
          if (lowerText.includes('booking') || lowerText.includes('book') || lowerText.includes('event') || lowerText.includes('gig') || lowerText.includes('hire')) {
            return `🎤 You can book DJ Flowerz for your event through our **Bookings** page at djflowerz.co.ke/bookings. Fill in the event details, date, and venue, and we'll get back to you within 24 hours. For urgent bookings, email us at **bookings@djflowerz.co.ke**.`;
          }
          if (lowerText.includes('music pool') || lowerText.includes('download') || lowerText.includes('dj tracks') || lowerText.includes('pool')) {
            return `🎵 The **Music Pool** is our exclusive subscription service for DJs — featuring curated, high-quality tracks, edits and tools. Subscribe from your account and get immediate access. Visit **djflowerz.co.ke/music-pool** to learn more. You need an active subscription to download tracks.`;
          }
          if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('how much') || lowerText.includes('fee')) {
            return `💰 Our pricing varies by service:\n\n• **Music Pool Subscription**: Check /music-pool for current tiers\n• **Marketplace Trades**: 5% Escrow Protection fee (covered by seller)\n• **Merch & Digital**: Browse at /store\n\nFor custom quotes, email **admin@djflowerz.co.ke**.`;
          }
          if (lowerText.includes('refund') || lowerText.includes('return') || lowerText.includes('cancel')) {
            return `📋 Our refund policy:\n\n• **Marketplace/Escrow**: Refunds are issued if the seller fails to deliver as described.\n• **Digital downloads**: All sales final once download link is accessed.\n• **Physical merchandise**: 14-day return window.\n\nRead the full policy at **djflowerz.co.ke/refund**.`;
          }
          if (lowerText.includes('store') || lowerText.includes('merch') || lowerText.includes('product')) {
            return `🛍️ Our store carries official **DJ Flowerz merchandise** — from branded apparel to digital products. Visit **djflowerz.co.ke/store** to browse. We support M-Pesa, card payments, and escrow for marketplace transactions.`;
          }
          if (lowerText.includes('order') || lowerText.includes('payment') || lowerText.includes('mpesa') || lowerText.includes('checkout')) {
            return `💳 For order issues or payment questions:\n\n• Your order ID follows the format **ORD-XXXXXXX**\n• For M-Pesa issues, allow up to 2 minutes for confirmation\n• Email **admin@djflowerz.co.ke** with your order number for support`;
          }
          if (lowerText.includes('mixtape') || lowerText.includes('mix') || lowerText.includes('set')) {
            return `🎧 DJ Flowerz drops regular **mixtapes** featuring the hottest Afrobeats, Gengetone, Gospel, Dancehall and more. Stream or download free mixtapes at **djflowerz.co.ke/mixtapes**.`;
          }
          if (lowerText.includes('community') || lowerText.includes('post') || lowerText.includes('social') || lowerText.includes('feed')) {
            return `🌐 Join the **DJ Flowerz Community Hub** to connect with fellow music lovers, share posts, sell/buy gear in the marketplace, and stay updated. Visit **djflowerz.co.ke/community** — sign up or log in to participate!`;
          }
          if (lowerText.includes('human') || lowerText.includes('agent') || lowerText.includes('person') || lowerText.includes('support')) {
            return `🎧 I'll escalate this to a human agent. Our team is available **Mon–Sat, 9am–6pm EAT**. You can also reach us directly:\n\n📧 **admin@djflowerz.co.ke**\n\nYour ticket number is active — an agent will respond as soon as possible.`;
          }
          if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey') || lowerText.includes('good')) {
            return `Hey there! 👋 I'm the **DJ Flowerz AI assistant**. I can help you with bookings, the Music Pool, safe marketplace trading (Escrow), store orders, and more. What do you need today?`;
          }
          if (lowerText.includes('social') || lowerText.includes('instagram') || lowerText.includes('facebook') || lowerText.includes('twitter') || lowerText.includes('tiktok')) {
            return `📱 Follow DJ Flowerz on all social platforms for the latest drops and updates:\n\n• Instagram: @dj_flowerz_creations\n• Twitter/X: @djflowerz\n• Facebook: DJ Flowerz\n• TikTok: @djflowerz\n\nStay in the loop! 🔥`;
          }
          // Default fallback
          return `Thanks for your message! I'm the **DJ Flowerz AI assistant**, and I'm here to help with:\n\n• 🛡️ **Escrow & Safe Trading** in the marketplace\n• 🎤 Bookings & events\n• 🎵 Music Pool subscription\n• 🛍️ Store & orders\n• 🎧 Mixtapes\n\nCould you clarify what you need, or type **"human"** to speak with a real agent?`;
        })();

        // Save bot reply
        await env.DB.prepare(`INSERT INTO chat_messages (session_id, sender, text) VALUES (?, 'bot', ?)`).bind(sessionId, botReply).run();

        return json({ success: true });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
    }

  // POST /api/chat/escalate — request human agent
  if (path === '/api/chat/escalate' && method === 'POST') {
    try {
      await ensureChatTables();
      const { sessionId } = await request.json() as any;
      await env.DB.prepare(`UPDATE chat_sessions SET status = 'human' WHERE id = ?`).bind(sessionId).run();
      await env.DB.prepare(`INSERT INTO chat_messages (session_id, sender, text) VALUES (?, 'bot', ?)`).bind(sessionId, '🎧 You\'ve been connected to our support team. An agent will be with you shortly. Our support hours are **Mon–Sat, 9am–6pm EAT**.').run();
      return json({ success: true });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRUST & BADGE SYSTEM ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Ensure trust tables exist (idempotent)
  const ensureTrustTables = async () => {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        reported_user_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        post_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_vouches (
        id TEXT PRIMARY KEY,
        voucher_id TEXT NOT NULL,
        vouchee_id TEXT NOT NULL,
        note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS flagged_content (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        user_id TEXT,
        user_handle TEXT,
        content_snippet TEXT,
        keyword_triggered TEXT,
        reason TEXT DEFAULT 'keyword_match',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS seller_badges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        badge_type TEXT NOT NULL,
        awarded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT
      )`),
    ]);
  };

  // ── POST /api/community/report ────────────────────────────────────────────
  // Report a user. Auto-increments strikes and applies caution/shadow-ban.
  if (path === '/api/community/report' && method === 'POST') {
    if (!actorId) return json({ error: 'Authentication required' }, 401);
    try {
      await ensureTrustTables();
      const { reported_user_id, reason, details, post_id } = await request.json() as any;
      if (!reported_user_id || !reason) return json({ error: 'reported_user_id and reason are required' }, 400);
      if (reported_user_id === actorId) return json({ error: 'You cannot report yourself' }, 400);

      // Prevent duplicate reports from same user within 30 days
      const existing = await env.DB.prepare(`
        SELECT id FROM user_reports 
        WHERE reporter_id = ? AND reported_user_id = ?
        AND datetime(created_at) > datetime('now', '-30 days')
      `).bind(actorId, reported_user_id).first();
      if (existing) return json({ error: 'You have already reported this user recently' }, 409);

      const reportId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO user_reports (id, reporter_id, reported_user_id, reason, details, post_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(reportId, actorId, reported_user_id, reason, details || null, post_id || null).run();

      // Count unique reports in last 30 days for this user
      const { count } = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM user_reports 
        WHERE reported_user_id = ? AND datetime(created_at) > datetime('now', '-30 days') AND status != 'dismissed'
      `).bind(reported_user_id).first() as any;

      let newTier = null;
      let shadowBanned = 0;

      if (count >= 5) {
        // Hard shadow-ban
        await env.DB.prepare(`UPDATE profiles SET is_shadow_banned = 1, strikes = ?, aura_tier = 'SUSPENDED' WHERE id = ?`)
          .bind(count, reported_user_id).run();
        shadowBanned = 1;
        // Remove marketplace listings from visibility
        await env.DB.prepare(`UPDATE pulses SET is_shadow_banned = 1 WHERE author_id = ? AND is_marketplace = 1`)
          .bind(reported_user_id).run().catch(() => {});

        await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('AUTO_SHADOW_BAN', ?, 'SYSTEM')`)
          .bind(`User ${reported_user_id} auto-shadow-banned after ${count} reports`).run();
      } else if (count >= 3) {
        // Caution badge
        await env.DB.prepare(`UPDATE profiles SET strikes = ?, aura_tier = 'CAUTION' WHERE id = ?`)
          .bind(count, reported_user_id).run();
        newTier = 'CAUTION';
        // Award caution badge
        await env.DB.prepare(`
          INSERT OR REPLACE INTO seller_badges (id, user_id, badge_type, expires_at)
          VALUES (?, ?, 'caution', datetime('now', '+30 days'))
        `).bind(crypto.randomUUID(), reported_user_id).run();
      } else {
        await env.DB.prepare(`UPDATE profiles SET strikes = ? WHERE id = ?`)
          .bind(count, reported_user_id).run();
      }

      return json({ success: true, report_id: reportId, total_reports: count, new_tier: newTier, shadow_banned: shadowBanned });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/community/vouch ─────────────────────────────────────────────
  // Vouch for another user. Requires 10+ completed_trades.
  if (path === '/api/community/vouch' && method === 'POST') {
    if (!actorId) return json({ error: 'Authentication required' }, 401);
    try {
      await ensureTrustTables();
      const { vouchee_id, note } = await request.json() as any;
      if (!vouchee_id) return json({ error: 'vouchee_id is required' }, 400);
      if (vouchee_id === actorId) return json({ error: 'Cannot vouch for yourself' }, 400);

      // Check voucher eligibility
      const voucher = await env.DB.prepare(`SELECT completed_trades FROM profiles WHERE id = ?`).bind(actorId).first() as any;
      if (!voucher || (voucher.completed_trades || 0) < 5) {
        return json({ error: 'You need at least 5 completed trades to vouch for others' }, 403);
      }

      // One vouch per pair ever
      const existingVouch = await env.DB.prepare(`
        SELECT id FROM community_vouches WHERE voucher_id = ? AND vouchee_id = ?
      `).bind(actorId, vouchee_id).first();
      if (existingVouch) return json({ error: 'You have already vouched for this user' }, 409);

      const vouchId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO community_vouches (id, voucher_id, vouchee_id, note)
        VALUES (?, ?, ?, ?)
      `).bind(vouchId, actorId, vouchee_id, note || null).run();

      return json({ success: true, vouch_id: vouchId });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/profiles/request-verification ───────────────────────────────
  // User requests email verification — sets status to 'requested'
  if (path === '/api/profiles/request-verification' && method === 'POST') {
    if (!actorId) return json({ error: 'Authentication required' }, 401);
    try {
      const profile = await env.DB.prepare(`SELECT verification_status FROM profiles WHERE id = ?`).bind(actorId).first() as any;
      if (!profile) return json({ error: 'Profile not found' }, 404);
      if (profile.verification_status === 'verified') return json({ error: 'Already verified' }, 409);
      if (profile.verification_status === 'requested') return json({ error: 'Request already pending admin review' }, 409);

      await env.DB.prepare(`UPDATE profiles SET verification_status = 'requested' WHERE id = ?`).bind(actorId).run();
      await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('VERIFY_REQUEST', ?, 'SYSTEM')`)
        .bind(`User ${actorId} (${jwtEmail}) requested email verification`).run();

      return json({ success: true, message: 'Verification request submitted. Our team will review your profile within 24 hours.' });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/admin/verify/:userId ───────────────────────────────────────
  // Admin approves verification request AND generates OTP (or manually verifies)
  if (method === 'POST' && path.match(/^\/api\/admin\/verify\/[^/]+$/)) {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const targetUserId = path.split('/').pop()!;
      const body = await request.json() as any;
      const manual = body?.manual_override === true;

      if (manual) {
        // Instant verification bypass
        await env.DB.prepare(`
          UPDATE profiles SET verification_status = 'verified', is_verified = 1, is_manual_verify = 1, is_eligible = 1 WHERE id = ?
        `).bind(targetUserId).run();
        await env.DB.prepare(`
          INSERT OR REPLACE INTO seller_badges (id, user_id, badge_type)
          VALUES (?, ?, 'verified')
        `).bind(crypto.randomUUID(), targetUserId).run();
        await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('MANUAL_VERIFY', ?, ?)`)
          .bind(`User ${targetUserId} manually verified`, jwtEmail).run();
        return json({ success: true, type: 'manual', message: 'User manually verified and badge awarded.' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await env.DB.prepare(`
        UPDATE profiles SET 
          verification_status = 'approved',
          is_eligible = 1,
          otp_code = ?,
          otp_expiry = ?,
          verification_attempts = 0
        WHERE id = ?
      `).bind(otp, expiry, targetUserId).run();

      await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('VERIFY_APPROVE', ?, ?)`)
        .bind(`OTP generated for ${targetUserId} — expires ${expiry}`, jwtEmail).run();

      // Return OTP in response (admin can send via WhatsApp)
      return json({ success: true, otp, expiry, message: `OTP generated: ${otp}. Share with user via WhatsApp. Expires in 24 hours.` });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/admin/verify/:userId/reject ────────────────────────────────
  if (method === 'POST' && path.match(/^\/api\/admin\/verify\/[^/]+\/reject$/)) {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const parts = path.split('/');
      const targetUserId = parts[parts.length - 2];
      await env.DB.prepare(`UPDATE profiles SET verification_status = 'none' WHERE id = ?`).bind(targetUserId).run();
      await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('VERIFY_REJECT', ?, ?)`)
        .bind(`Verification rejected for user ${targetUserId}`, jwtEmail).run();
      return json({ success: true, message: 'Verification request rejected.' });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/profiles/verify-otp ────────────────────────────────────────
  // User submits their 6-digit OTP to complete verification
  if (path === '/api/profiles/verify-otp' && method === 'POST') {
    if (!actorId) return json({ error: 'Authentication required' }, 401);
    try {
      const { otp_code } = await request.json() as any;
      if (!otp_code) return json({ error: 'otp_code is required' }, 400);

      const profile = await env.DB.prepare(`
        SELECT verification_status, is_eligible, otp_code, otp_expiry, verification_attempts
        FROM profiles WHERE id = ?
      `).bind(actorId).first() as any;

      if (!profile) return json({ error: 'Profile not found' }, 404);
      if (profile.verification_status === 'verified') return json({ error: 'Already verified' }, 409);
      if (!profile.is_eligible) return json({ error: 'Not approved for verification yet' }, 403);
      if ((profile.verification_attempts || 0) >= 5) return json({ error: 'Too many failed attempts. Contact support.' }, 429);

      const now = new Date().toISOString();
      if (!profile.otp_expiry || now > profile.otp_expiry) {
        return json({ error: 'This OTP has expired. Please request a new one from admin.' }, 410);
      }

      if (String(profile.otp_code) !== String(otp_code)) {
        await env.DB.prepare(`UPDATE profiles SET verification_attempts = verification_attempts + 1 WHERE id = ?`).bind(actorId).run();
        return json({ error: 'Incorrect code. Please check your email and try again.' }, 400);
      }

      // ✅ Verified!
      await env.DB.prepare(`
        UPDATE profiles SET 
          verification_status = 'verified',
          is_verified = 1,
          otp_code = NULL,
          otp_expiry = NULL,
          verification_attempts = 0
        WHERE id = ?
      `).bind(actorId).run();

      // Award verified badge
      await env.DB.prepare(`
        INSERT OR REPLACE INTO seller_badges (id, user_id, badge_type)
        VALUES (?, ?, 'verified')
      `).bind(crypto.randomUUID(), actorId).run();

      await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('EMAIL_VERIFIED', ?, 'SYSTEM')`)
        .bind(`User ${actorId} successfully completed email verification`).run();

      return json({ success: true, message: '🎉 Verified! Your Verified Member badge is now active.' });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/community/flag-content ─────────────────────────────────────
  // Check post content against blacklist. Returns { flagged, reason, keyword }
  if (path === '/api/community/flag-content' && method === 'POST') {
    try {
      await ensureTrustTables();
      const { content, post_id, user_id, user_handle } = await request.json() as any;
      if (!content) return json({ flagged: false });

      const BLACKLIST = [
        // Off-platform contact leakage
        { keyword: 'whatsapp', reason: 'off_platform' },
        { keyword: 'watsap', reason: 'off_platform' },
        { keyword: 'inbox me', reason: 'off_platform' },
        { keyword: 'dm me', reason: 'off_platform' },
        { keyword: 'call me', reason: 'off_platform' },
        { keyword: 'direct mpesa', reason: 'off_platform' },
        { keyword: 'direct m-pesa', reason: 'off_platform' },
        { keyword: 'send to my number', reason: 'off_platform' },
        { keyword: 'tuma kwa hii number', reason: 'off_platform' },
        { keyword: 'pay me directly', reason: 'off_platform' },
        { keyword: 'personal mpesa', reason: 'off_platform' },
        // Kenyan scam phrases
        { keyword: 'tuma fare', reason: 'scam' },
        { keyword: 'i sent money by mistake', reason: 'scam' },
        { keyword: 'reverse the money', reason: 'scam' },
        { keyword: 'deposit first', reason: 'scam' },
        { keyword: 'registration fee', reason: 'scam' },
        { keyword: 'send half first', reason: 'scam' },
        { keyword: 'you have won', reason: 'scam' },
        { keyword: 'you are a winner', reason: 'scam' },
        { keyword: 'job opportunity', reason: 'scam' },
        { keyword: 'work from home', reason: 'scam' },
        // Too-good-to-be-true pricing
        { keyword: 'free controller', reason: 'suspicious_pricing' },
        { keyword: 'xdj for 5k', reason: 'suspicious_pricing' },
        { keyword: 'cdj for 10k', reason: 'suspicious_pricing' },
        { keyword: 'cheapest in kenya', reason: 'suspicious_pricing' },
        { keyword: 'must go today', reason: 'suspicious_pricing' },
        // Phone numbers pattern handled client-side; also flag server-side
        { keyword: '0722', reason: 'phone_number_leak' },
        { keyword: '0712', reason: 'phone_number_leak' },
        { keyword: '0700', reason: 'phone_number_leak' },
        { keyword: '0701', reason: 'phone_number_leak' },
        { keyword: '0711', reason: 'phone_number_leak' },
        { keyword: '0729', reason: 'phone_number_leak' },
      ];

      const lowerContent = content.toLowerCase();
      const hit = BLACKLIST.find(item => lowerContent.includes(item.keyword));

      if (hit) {
        // Save to flagged_content for admin review
        const flagId = crypto.randomUUID();
        const snippet = content.slice(0, 200);
        await env.DB.prepare(`
          INSERT INTO flagged_content (id, post_id, user_id, user_handle, content_snippet, keyword_triggered, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(flagId, post_id || null, user_id || null, user_handle || null, snippet, hit.keyword, hit.reason).run();

        return json({ flagged: true, reason: hit.reason, keyword: hit.keyword, flag_id: flagId });
      }

      return json({ flagged: false });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── GET /api/profiles/:id/scorecard ──────────────────────────────────────
  // Fetch trust scorecard data for a user profile
  if (method === 'GET' && path.match(/^\/api\/profiles\/[^/]+\/scorecard$/)) {
    try {
      await ensureTrustTables();
      const userId = path.split('/')[3];

      const profile = await env.DB.prepare(`
        SELECT id, completed_trades, cancel_rate, avg_response_hours, 
               is_verified, strikes, aura_tier, primary_role, location, created_at
        FROM profiles WHERE id = ?
      `).bind(userId).first() as any;

      if (!profile) return json({ error: 'Profile not found' }, 404);

      const { results: badges } = await env.DB.prepare(`
        SELECT badge_type FROM seller_badges 
        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      `).bind(userId).all();

      const { count: vouchCount } = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM community_vouches WHERE vouchee_id = ?
      `).bind(userId).first() as any;

      const createdAt = new Date(profile.created_at || Date.now());
      const monthsOld = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

      // Auto-award established badge if 12+ months and not already awarded
      if (monthsOld >= 12) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO seller_badges (id, user_id, badge_type)
          VALUES (?, ?, 'established')
        `).bind(crypto.randomUUID(), userId).run();
      }

      return json({
        completed_trades: profile.completed_trades || 0,
        cancel_rate: profile.cancel_rate || 0,
        avg_response_hours: profile.avg_response_hours || 0,
        vouch_count: vouchCount || 0,
        badges: badges.map((b: any) => b.badge_type),
        account_age_months: monthsOld,
        is_verified: !!profile.is_verified,
        strikes: profile.strikes || 0,
        aura_tier: profile.aura_tier || 'Newcomer',
        primary_role: profile.primary_role,
        location: profile.location,
      });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── GET /api/admin/trust/verification-queue ───────────────────────────────
  // Admin: List all profiles with verification_status = 'requested'
  if (path === '/api/admin/trust/verification-queue' && method === 'GET') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const { results } = await env.DB.prepare(`
        SELECT id, email, full_name, avatar_url, handle, bio, location, social_links,
               verification_status, created_at, completed_trades, aura_tier,
               (SELECT COUNT(*) FROM pulses WHERE author_id = profiles.id) as post_count
        FROM profiles WHERE verification_status = 'requested'
        ORDER BY created_at DESC
      `).all();
      return json({ queue: results });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── GET /api/admin/trust/flagged-content ─────────────────────────────────
  // Admin: List all pending flagged posts
  if (path === '/api/admin/trust/flagged-content' && method === 'GET') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const { results } = await env.DB.prepare(`
        SELECT * FROM flagged_content WHERE status = 'pending'
        ORDER BY created_at DESC LIMIT 100
      `).all();
      return json({ flags: results });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── PATCH /api/admin/trust/flagged-content/:id ────────────────────────────
  // Admin: Dismiss or action a flagged content item
  if (method === 'PATCH' && path.match(/^\/api\/admin\/trust\/flagged-content\/[^/]+$/)) {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const flagId = path.split('/').pop()!;
      const { status, action } = await request.json() as any; // status: 'dismissed'|'actioned'

      await env.DB.prepare(`UPDATE flagged_content SET status = ? WHERE id = ?`).bind(status, flagId).run();

      // If actioned = delete the post
      if (action === 'delete_post') {
        const flag = await env.DB.prepare(`SELECT post_id FROM flagged_content WHERE id = ?`).bind(flagId).first() as any;
        if (flag?.post_id) {
          await env.DB.prepare(`DELETE FROM pulses WHERE id = ?`).bind(flag.post_id).run();
        }
      }

      await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('FLAG_ACTIONED', ?, ?)`)
        .bind(`Flag ${flagId} marked as ${status}${action ? ` — action: ${action}` : ''}`, jwtEmail).run();

      return json({ success: true });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── GET /api/admin/trust/strikes ─────────────────────────────────────────
  // Admin: List users with 1+ strikes
  if (path === '/api/admin/trust/strikes' && method === 'GET') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const { results } = await env.DB.prepare(`
        SELECT p.id, p.email, p.full_name, p.handle, p.avatar_url, p.strikes, 
               p.is_shadow_banned, p.aura_tier, p.completed_trades,
               COUNT(r.id) as total_reports
        FROM profiles p
        LEFT JOIN user_reports r ON r.reported_user_id = p.id AND r.status != 'dismissed'
        WHERE p.strikes >= 1
        GROUP BY p.id
        ORDER BY p.strikes DESC
      `).all();
      return json({ users: results });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/admin/trust/shadow-ban ─────────────────────────────────────
  // Admin: Toggle shadow-ban for a user
  if (path === '/api/admin/trust/shadow-ban' && method === 'POST') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const { user_id, shadow_banned } = await request.json() as any;
      if (!user_id) return json({ error: 'user_id required' }, 400);

      await env.DB.prepare(`UPDATE profiles SET is_shadow_banned = ? WHERE id = ?`).bind(shadow_banned ? 1 : 0, user_id).run();

      if (shadow_banned) {
        // Hide their marketplace posts
        await env.DB.prepare(`UPDATE pulses SET is_shadow_banned = 1 WHERE author_id = ?`).bind(user_id).run().catch(() => {});
      } else {
        // Restore visibility
        await env.DB.prepare(`UPDATE pulses SET is_shadow_banned = 0 WHERE author_id = ?`).bind(user_id).run().catch(() => {});
      }

      await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES (?, ?, ?)`)
        .bind(shadow_banned ? 'SHADOW_BAN' : 'SHADOW_BAN_LIFT', `User ${user_id} ${shadow_banned ? 'shadow-banned' : 'shadow-ban lifted'}`, jwtEmail).run();

      return json({ success: true, shadow_banned });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── PATCH /api/admin/trust/strikes/:userId ────────────────────────────────
  // Admin: Manually add or clear strikes
  if (method === 'PATCH' && path.match(/^\/api\/admin\/trust\/strikes\/[^/]+$/)) {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const targetUserId = path.split('/').pop()!;
      const { strikes, aura_tier } = await request.json() as any;

      await env.DB.prepare(`UPDATE profiles SET strikes = ?, aura_tier = ? WHERE id = ?`)
        .bind(strikes ?? 0, aura_tier || 'Newcomer', targetUserId).run();

      if ((strikes ?? 0) < 3) {
        // Remove caution badge if strikes cleared
        await env.DB.prepare(`DELETE FROM seller_badges WHERE user_id = ? AND badge_type = 'caution'`)
          .bind(targetUserId).run();
      }

      await env.DB.prepare(`INSERT INTO admin_logs (action, details, admin_user) VALUES ('STRIKE_UPDATE', ?, ?)`)
        .bind(`Strikes for ${targetUserId} updated to ${strikes}`, jwtEmail).run();

      return json({ success: true });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── GET /api/admin/trust/vouches ─────────────────────────────────────────
  // Admin: List all vouching relationships
  if (path === '/api/admin/trust/vouches' && method === 'GET') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      await ensureTrustTables();
      const { results } = await env.DB.prepare(`
        SELECT cv.*, 
               vr.full_name as voucher_name, vr.handle as voucher_handle,
               ve.full_name as vouchee_name, ve.handle as vouchee_handle,
               ve.is_shadow_banned as vouchee_banned
        FROM community_vouches cv
        LEFT JOIN profiles vr ON cv.voucher_id = vr.id
        LEFT JOIN profiles ve ON cv.vouchee_id = ve.id
        ORDER BY cv.created_at DESC
      `).all();
      return json({ vouches: results });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── GET /api/community/seller-of-month ───────────────────────────────────
  // Returns the top seller of the month based on completed trades & low strikes
  if (path === '/api/community/seller-of-month' && method === 'GET') {
    try {
      const winner = await env.DB.prepare(`
        SELECT id, full_name, handle, avatar_url, completed_trades, aura_tier, primary_role, location
        FROM profiles
        WHERE is_shadow_banned = 0 AND strikes < 3 AND completed_trades > 0
        ORDER BY completed_trades DESC
        LIMIT 1
      `).first();
      if (!winner) return json({ winner: null });
      return json({ winner });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // GET /api/admin/active-subscribers
  if (path === '/api/admin/active-subscribers' && method === 'GET') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const { results } = await env.DB.prepare(`
        SELECT s.*, p.full_name, p.avatar_url 
        FROM "active-subscribers" s
        LEFT JOIN profiles p ON s.id = p.id
        ORDER BY s.expiry_date DESC
      `).all();
      return json(results || []);
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // POST /api/admin/subscriptions/manage (Unified Handler for Subscriptions.tsx)
  if (path === '/api/admin/subscriptions/manage' && method === 'POST') {
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
      const body = await request.json() as any;
      const { action, email, days, plan } = body;

      if (action === 'grant') {
        const targetEmail = (email || '').toLowerCase();
        const grantDays = days || 30; // default 30 days
        const expiry = new Date(Date.now() + grantDays * 24 * 60 * 60 * 1000).toISOString();
        
        // Try to find profile, but proceed even if not found
        const targetProfile = await env.DB.prepare('SELECT id FROM profiles WHERE email = ?').bind(targetEmail).first() as any;
        const targetId = targetProfile ? targetProfile.id : targetEmail; // Fallback to email as ID if no profile

        await env.DB.batch([
          env.DB.prepare('INSERT OR REPLACE INTO "active-subscribers" (id, user_email, status, expiry_date, plan_id) VALUES (?, ?, ?, ?, ?)')
            .bind(targetId, targetEmail, 'active', expiry, plan || 'Premium'),
          targetProfile ? env.DB.prepare('UPDATE profiles SET is_subscriber = 1, subscription_expiry = ? WHERE id = ?').bind(expiry, targetId) : 
          env.DB.prepare('SELECT 1') // no-op if no profile
        ]);

        return json({ success: true, expiry });
      }

      if (action === 'revoke') {
        const targetEmail = (email || '').toLowerCase();
        await env.DB.batch([
          env.DB.prepare('DELETE FROM "active-subscribers" WHERE user_email = ?').bind(targetEmail),
          env.DB.prepare('UPDATE profiles SET is_subscriber = 0, subscription_expiry = NULL WHERE email = ?').bind(targetEmail)
        ]);
        return json({ success: true });
      }

      return json({ error: 'Unknown action' }, 400);
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // ── Music Pool Subscription Management (Legacy Endpoints) ──────────
  if (method === 'POST' && path === '/api/admin/subscriptions/grant') {
    // Redir to unified manage endpoint logic or keep for compat
    if (!jwtEmail || !ADMIN_EMAILS.includes(jwtEmail.toLowerCase())) return json({ error: 'Admin only' }, 403);
    try {
       const body = await request.json() as any;
       const expiry = new Date(Date.now() + body.days * 24 * 60 * 60 * 1000).toISOString();
       const email = body.email.toLowerCase();
       const targetProfile = await env.DB.prepare('SELECT id FROM profiles WHERE email = ?').bind(email).first() as any;
       const targetId = targetProfile ? targetProfile.id : email;

       await env.DB.prepare('INSERT OR REPLACE INTO "active-subscribers" (id, user_email, status, expiry_date, plan_id) VALUES (?, ?, ?, ?, ?)')
         .bind(targetId, email, 'active', expiry, 'Premium').run();
       
       if (targetProfile) {
         await env.DB.prepare('UPDATE profiles SET is_subscriber = 1, subscription_expiry = ? WHERE id = ?').bind(expiry, targetId).run();
       }

       return json({ success: true, expiry });
    } catch (e: any) { return json({ error: e.message }, 500); }
  }

  // ─── 404 ─────────────────────────────────────────────────────────────────────
  return json({ error: `Route ${method} ${path} not found` }, 404);
}

