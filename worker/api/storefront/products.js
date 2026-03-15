// worker/api/storefront/products.js

export async function handleStorefrontProducts(request, env, ctx, params) {
    const url = new URL(request.url);
    const id = params?.id;

    if (id) {
        try {
            const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? OR slug = ?")
                .bind(id, id)
                .first();

            if (!product) {
                return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
            }

            const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                .bind(product.id)
                .all();

            const enrichedProduct = {
                ...product,
                isActive: product.status === 'active',
                shortDescription: product.description ? product.description.substring(0, 100) : null,
                variants: variants || []
            };

            return new Response(JSON.stringify(enrichedProduct), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=60"
                }
            });
        } catch (e) {
            console.error("[Storefront Product GET ID Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    } else {
        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM products 
                WHERE status = 'active'
                ORDER BY createdAt DESC
            `).all();

            const mappedResults = await Promise.all(results.map(async (p) => {
                const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                    .bind(p.id)
                    .all();
                
                return {
                    ...p,
                    isActive: p.status === 'active',
                    isFeatured: false,
                    shortDescription: p.description ? p.description.substring(0, 100) : null,
                    variants: variants || []
                };
            }));

            return new Response(JSON.stringify(mappedResults), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=60"
                }
            });
        } catch (e) {
            console.error("[Storefront Products GET Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }
}
