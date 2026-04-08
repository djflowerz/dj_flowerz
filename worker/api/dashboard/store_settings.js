// worker/api/dashboard/store_settings.js
// Handles GET /api/store/settings  (public read)
// Handles PUT /api/admin/store/settings (admin write)

const DEFAULT_SETTINGS = {
  // Storefront Essentials
  heroLabel: 'Limited Time Launch Offer',
  heroTitle: 'Super Discount for early birds',
  heroSubtitle: 'Elevate your sound with DJ Flowerz premium music pool and production services.',
  heroImage: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?q=80&w=2670&auto=format&fit=crop',
  ctaText: 'Explore Pool',
  
  // Promotional
  promoCode: 'FREE256MAC',
  promoCodeEnabled: true,
  
  // Social Media Handles
  socials: {
    facebook: 'https://facebook.com/djflowerz',
    instagram: 'https://instagram.com/djflowerz',
    youtube: 'https://youtube.com/@djflowerz',
    whatsapp: '+254789783258',
    email: 'admin@djflowerz.co.ke'
  },

  // Contact Info
  contacts: {
    phone: '+254789783258',
    email: 'admin@djflowerz.co.ke',
    address: 'Nairobi, Kenya'
  },

  // Footer & Branding
  footerText: '© 2024 DJ FLOWERZ. ALL RIGHTS RESERVED.',
  brandLogo: null,

  // Logistics
  shippingMethods: [],
  shipping: {
    base_weight: 5,
    base_price: 500,
    increment_price: 50,
    hardship_surcharge: 1000,
    hardship_towns: ['lodwar', 'kakuma', 'lokichoggio'],
    premium_prices: {
      same_day: 700,
      one_hour: 1200,
      overnight: 400
    }
  }
};

export async function handleStoreSettings(request, env) {
  const method = request.method;

  // Ensure table exists
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS store_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (_) {
    // Table may already exist
  }

  if (method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        `SELECT key, value FROM store_settings`
      ).all();

      const settings = { ...DEFAULT_SETTINGS };
      for (const row of (results || [])) {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      }

      return Response.json(settings, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        }
      });
    } catch (err) {
      return Response.json(DEFAULT_SETTINGS, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  if (method === 'PUT' || method === 'PATCH') {
    // Admin-only
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const data = await request.json();
      const now = new Date().toISOString();

      const entries = Object.entries(data);
      for (const [key, value] of entries) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO store_settings (key, value, updated_at) VALUES (?, ?, ?)`
        ).bind(key, JSON.stringify(value), now).run();
      }

      return Response.json({ success: true });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
