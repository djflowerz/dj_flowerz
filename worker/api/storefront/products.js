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

            // Support both old and new field names for frontend compatibility
            const enrichedProduct = {
                ...product,
                isActive: product.is_active === 1,
                image: product.image_url || null,
                shortDescription: product.short_description || null,
                variants: variants || []
            };

            return new Response(JSON.stringify(enrichedProduct), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache, must-revalidate"
                }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    } else {
        try {
            const { results } = await env.DB.prepare(`
                SELECT 
                    p.*, 
                    c.name as category_name,
                    COALESCE(MIN(v.price), 0) as price,
                    COALESCE(MIN(v.compare_at_price), 0) as compare_at_price,
                    COALESCE(p.image_url, v.image_url) as image
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_variants v ON p.id = v.product_id
                WHERE p.is_active = 1
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `).all();

            // Ensure booleans are mapped correctly for the frontend
            const mappedResults = results.map(p => ({
                ...p,
                isActive: p.is_active === 1,
                isFeatured: p.is_featured === 1,
                image: p.image || p.image_url || null
            }));

            return new Response(JSON.stringify(mappedResults), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache, must-revalidate"
                }
            });
        } catch (e) {
            console.error("[Storefront Products GET Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }
}
