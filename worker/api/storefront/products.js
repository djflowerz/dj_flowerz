// worker/api/storefront/products.js

export async function handleStorefrontProducts(request, env, ctx, params) {
    const url = new URL(request.url);
    const id = params?.id;

    if (id) {
        try {
            const product = await env.DB.prepare("SELECT * FROM products_new WHERE id = ? OR slug = ?")
                .bind(id, id)
                .first();

            if (!product) {
                return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
            }

            const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                .bind(product.id)
                .all();

            return new Response(JSON.stringify({ ...product, variants }), {
                headers: { "Content-Type": "application/json" }
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
                    v.price,
                    v.compare_at_price,
                    v.image_url
                FROM products_new p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_variants v ON p.id = v.product_id
                WHERE p.is_active = 1
                GROUP BY p.id
            `).all();

            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }
}
