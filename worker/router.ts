import { Env } from './types';

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ─── 1. CORS Preflight ───────────────────────────────────────────────────────
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

  // ─── 2. Social & Community Routes ──────────────────────────────────────────
  
  // GET /api/social/feed
  if (path === '/api/social/feed' && method === 'GET') {
    const tab = url.searchParams.get('tab') || 'latest';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const before = url.searchParams.get('before'); // Cursor for pagination
    const actorId = request.headers.get('X-Actor-Id');

    let query = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comment_count
    `;
    
    if (actorId) {
      query += `, (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id AND user_id = ?) as liked_by_me `;
    } else {
      query += `, 0 as liked_by_me `;
    }

    query += ` FROM community_posts p `;

    const params: any[] = actorId ? [actorId] : [];

    // Filtering based on tabs
    const whereClauses: string[] = [];
    if (tab === 'marketplace') {
      whereClauses.push(`p.is_marketplace = 1`);
    }
    if (before) {
      whereClauses.push(`p.created_at < ?`);
      params.push(before);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    // Ordering
    if (tab === 'trending') {
      query += ` ORDER BY like_count DESC, created_at DESC `;
    } else {
      query += ` ORDER BY created_at DESC `;
    }

    query += ` LIMIT ? `;
    params.push(limit);

    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    // Determine next cursor
    const nextCursor = (results.length === limit) ? (results[results.length - 1] as any).created_at : null;

    return new Response(JSON.stringify({ 
      posts: results,
      next_cursor: nextCursor 
    }), { headers: commonHeaders });
  }

  // POST /api/social/posts
  if (path === '/api/social/posts' && method === 'POST') {
    const actorId = request.headers.get('X-Actor-Id');
    if (!actorId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: commonHeaders });

    const body: any = await request.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO community_posts (id, user_id, content, image_url, is_marketplace, price, author_name, author_avatar, author_role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, 
      actorId, 
      body.content || null, 
      body.image_url || null, 
      body.is_marketplace ? 1 : 0, 
      body.price || 0,
      body.author_name || 'Anonymous',
      body.author_avatar || '',
      body.author_role || 'user',
      now
    ).run();

    const post = await env.DB.prepare(`SELECT * FROM community_posts WHERE id = ?`).bind(id).first();

    return new Response(JSON.stringify({ post }), { headers: commonHeaders });
  }

  // GET /api/profiles/:username or :id
  if (path.startsWith('/api/profiles/') && method === 'GET') {
    const identifier = path.split('/').pop();
    // Reconstructing profile logic - normally would join with Supabase, 
    // but we'll check our local profiles cache/table if it exists
    const profile = await env.DB.prepare(`SELECT * FROM profiles WHERE username = ? OR id = ?`).bind(identifier, identifier).first();
    
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: commonHeaders });
    
    return new Response(JSON.stringify({ profile }), { headers: commonHeaders });
  }

  // ─── 3. Commerce Routes (Legacy support) ─────────────────────────────────────
  
  if (path === '/api/products' || path === '/api/v1/products') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC`).all();
      return new Response(JSON.stringify(results), { headers: commonHeaders });
    }
  }

  if (path === '/api/mixtapes') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT * FROM mixtapes ORDER BY date_added DESC`).all();
      return new Response(JSON.stringify(results), { headers: commonHeaders });
    }
  }

  // ─── 4. Default 404 ─────────────────────────────────────────────────────────
  return new Response(JSON.stringify({ error: `Route ${method} ${path} not found on reconstructed worker` }), {
    status: 404,
    headers: commonHeaders
  });
}
