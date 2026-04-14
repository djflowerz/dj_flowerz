// worker/api/storefront/products.js

export async function handleStorefrontProducts(request, env, ctx, params) {
    const url = new URL(request.url);
    const id = params?.id;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (id) {
        try {
            const product = await env.DB.prepare(`
                SELECT *, COALESCE(image, image_url) as image_url 
                FROM products_new 
                WHERE id = ? OR slug = ?
            `).bind(id, id).first().catch(async () => {
                return await env.DB.prepare("SELECT * FROM products WHERE id = ? OR slug = ?")
                    .bind(id, id)
                    .first().catch(() => null);
            });

            if (!product) {
                return new Response(JSON.stringify({ error: "Product not found" }), { 
                    status: 404,
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }

            const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                .bind(product.id)
                .all().catch(() => ({ results: [] }));

            const enrichedProduct = {
                ...product,
                isActive: Boolean(product.is_active || product.status === 'published' || true),
                isFeatured: Boolean(product.is_featured),
                shortDescription: product.description ? product.description.substring(0, 100) : null,
                variants: variants || []
            };

            return new Response(JSON.stringify(enrichedProduct), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=60",
                    ...corsHeaders
                }
            });
        } catch (e) {
            console.error("[Storefront Product GET ID Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { 
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }
    } else {
        try {
            const { results } = await env.DB.prepare(`
                SELECT *, COALESCE(image, image_url) as image_url 
                FROM products_new 
                WHERE is_active = 1 OR status = 'published'
                ORDER BY created_at DESC
            `).all().catch(async () => {
                const legacyRes = await env.DB.prepare(`
                    SELECT * FROM products 
                    ORDER BY created_at DESC
                `).all().catch(() => ({ results: [] }));
                return legacyRes;
            });

            const mappedResults = await Promise.all((results || []).map(async (p) => {
                const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                    .bind(p.id)
                    .all().catch(() => ({ results: [] }));
                
                return {
                    ...p,
                    isActive: Boolean(p.is_active !== undefined ? p.is_active : true),
                    isFeatured: Boolean(p.is_featured),
                    shortDescription: p.description ? p.description.substring(0, 100) : null,
                    variants: variants || []
                };
            }));

            return new Response(JSON.stringify(mappedResults), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=60",
                    ...corsHeaders
                }
            });
        } catch (e) {
            console.error("[Storefront Products GET Error]", e);
            // Instead of 500, return empty array to prevent dashboard crash
            return new Response(JSON.stringify([]), { 
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }
    }
}
