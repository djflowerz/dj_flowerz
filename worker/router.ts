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
      
      const isSub = await env.DB.prepare('SELECT status FROM "active-subscribers" WHERE id = ?').bind(actorId).first();
      // Require subscription unless it's an order or a public mixtape
      if (!isSub && !orderId && type !== 'mixtape_audio' && type !== 'mixtape_video') {
         // Allow if admin
         if (!jwtEmail || jwtEmail !== adminEmail) {
             return json({ error: 'Active subscription required' }, 403);
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
  if (path === '/api/profiles/me' && method === 'GET') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const profile = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(actorId).first();
    if (!profile) return json({ needsSetup: true });
    return json(profile);
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
        (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'echo') as echoes
        FROM pulses p 
        WHERE author_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
      `).bind(profile.id).all();

      return json({ 
        ...profile,
        available: false,
        pulses: pulses || []
      });
    }
    return json({ available: true, handle });
  }

  // POST /api/profiles/handle/claim
  if (path === '/api/profiles/handle/claim' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { handle, fullName, role } = await request.json() as any;
    const cleanHandle = handle.toLowerCase().replace(/^@/, '');
    
    // Check if handle taken
    const existing = await env.DB.prepare('SELECT id FROM profiles WHERE handle = ?').bind(cleanHandle).first();
    if (existing) return json({ error: 'Handle already claimed' }, 400);

    try {
      await env.DB.prepare(`
        INSERT INTO profiles (id, handle, full_name, primary_role, aura_tier, aura_points, updated_at)
        VALUES (?, ?, ?, ?, 'standard', 100, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          handle = EXCLUDED.handle,
          full_name = EXCLUDED.full_name,
          primary_role = EXCLUDED.primary_role,
          aura_tier = 'standard',
          aura_points = 100,
          updated_at = CURRENT_TIMESTAMP
      `).bind(actorId, cleanHandle, fullName || '', role || 'Collector').run();
      
      return json({ success: true, handle: cleanHandle });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // GET /api/pulses (The Multi-Vector Feed)
  if (path === '/api/pulses' && method === 'GET') {
    const vector = url.searchParams.get('vector') || 'latest';
    let query = `
      SELECT p.*, pr.handle as author_handle, pr.full_name as author_name, pr.avatar_url as author_avatar, pr.aura_tier as author_tier,
      (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'heart') as hearts,
      (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id AND type = 'echo') as echoes
      FROM pulses p
      JOIN profiles pr ON p.author_id = pr.id
    `;

    if (vector === 'trending') {
      query += ` ORDER BY (SELECT COUNT(*) FROM pulse_reactions WHERE pulse_id = p.id) DESC, p.created_at DESC LIMIT 50`;
    } else if (vector === 'marketplace') {
      query += ` WHERE p.type = 'deal' ORDER BY p.created_at DESC LIMIT 50`;
    } else {
      query += ` ORDER BY p.created_at DESC LIMIT 50`;
    }

    const { results } = await env.DB.prepare(query).all();
    return json(results || []);
  }

  // POST /api/pulses (Broadcast a Signal)
  if (path === '/api/pulses' && method === 'POST') {
    if (!actorId) return json({ error: 'Unauthorized' }, 401);
    const { content, mediaUrl, type, price } = await request.json() as any;
    const id = crypto.randomUUID();

    try {
      await env.DB.prepare(`
        INSERT INTO pulses (id, author_id, content, media_url, type, deal_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, actorId, content, mediaUrl || null, type || 'text', price || null).run();

      // Award Aura for activity
      await env.DB.prepare('UPDATE profiles SET aura_points = aura_points + 5 WHERE id = ?').bind(actorId).run();

      return json({ success: true, id });
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
      await env.DB.prepare(`
        INSERT INTO pulse_reactions (id, pulse_id, user_id, type)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(pulse_id, user_id, type) DO DELETE
      `).bind(id, pulseId, actorId, type).run();

      return json({ success: true });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
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
      const orderId = crypto.randomUUID();
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
          reference: `ORD_${Date.now()}_${orderId.substring(0, 6)}`,
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
          totalTips: (stats[3].results?.[1] as any)?.count || 0, // Note: index changed
          recentActivity
        });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
    }


    // PUT /api/admin/store/settings
    if (path === '/api/admin/store/settings' && method === 'PUT') {
      try {
        const payload = await request.text();
        await env.KV.put('store_settings', payload);
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
      return json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' });
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

    // POST /api/admin/sync-paystack (Stub)
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

    // POST /api/presence
    if (path === '/api/presence' && method === 'POST') {
      return json({ success: true });
    }

  }


  // ─── 404 ─────────────────────────────────────────────────────────────────────
  return json({ error: `Route ${method} ${path} not found` }, 404);
}
