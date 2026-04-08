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
            const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? OR slug = ?")
                .bind(id, id)
                .first();

            if (!product) {
                return new Response(JSON.stringify({ error: "Product not found" }), { 
                    status: 404,
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }

            const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                .bind(product.id)
                .all();

            const enrichedProduct = {
                ...product,
                isActive: Boolean(product.is_active),
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
                SELECT * FROM products 
                WHERE is_active = 1
                ORDER BY created_at DESC
            `).all();

            const mappedResults = await Promise.all(results.map(async (p) => {
                const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                    .bind(p.id)
                    .all();
                
                return {
                    ...p,
                    isActive: Boolean(p.is_active),
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
            return new Response(JSON.stringify({ error: e.message }), { 
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }
    }
}
