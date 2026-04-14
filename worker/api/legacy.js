// worker/api/legacy.js

export async function handleLegacy(request, env, ctx, params) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/data/')) {
        const collection = path.replace('/api/data/', '').replace('.json', '');

        try {
            let results;
            if (collection === 'products') {
                const { results: products } = await env.DB.prepare(`
                    SELECT p.*, v.price, v.compare_at_price, v.image_url
                    FROM products p
                    LEFT JOIN product_variants v ON p.id = v.product_id
                    GROUP BY p.id
                `).all().catch(() => ({ results: [] }));
                results = products;
            } else if (collection === 'mixtapes') {
                const { results: mixtapes } = await env.DB.prepare(`
                    SELECT *, 
                    cover_url AS coverUrl, 
                    audio_url AS audioUrl, 
                    download_url AS downloadUrl, 
                    FALSE AS isPremium,
                    FALSE AS isExclusive,
                    FALSE AS is_premium,
                    FALSE AS is_exclusive,
                    'free' AS required_tier
                    FROM mixtapes 
                    ORDER BY release_date DESC
                `).all().catch(() => ({ results: [] }));
                results = mixtapes;
            } else if (collection === 'settings') {
                const setting = await env.DB.prepare("SELECT data FROM settings WHERE id = 'siteConfig'").first().catch(() => null);
                results = setting ? JSON.parse(setting.data) : {};
            } else if (collection === 'payments' || collection === 'tips' || collection === 'reviews') {
                results = [];
            } else {
                results = []; // Fallback to empty array for unknown legacy collections
            }

            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (path === '/api/mixtapes') {
        try {
            const { results } = await env.DB.prepare(`
                SELECT *, 
                cover_url AS coverUrl, 
                audio_url AS audioUrl, 
                download_url AS downloadUrl, 
                FALSE AS isPremium,
                FALSE AS isExclusive,
                FALSE AS is_premium,
                FALSE AS is_exclusive,
                'free' AS required_tier
                FROM mixtapes 
                ORDER BY release_date DESC
            `).all().catch(() => ({ results: [] }));
            return new Response(JSON.stringify(results), {
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        } catch (e) {
            return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
    }

    if (path === '/api/broadcast' || path === '/admin/broadcast') {
        const id = env.ADMIN_HUB.idFromName("global_admin");
        const obj = env.ADMIN_HUB.get(id);
        return await obj.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
}
