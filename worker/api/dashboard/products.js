// worker/api/dashboard/products.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardProducts(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401 });

    const url = new URL(request.url);
    const method = request.method;

    if (method === 'GET') {
        try {
            const { results } = await env.DB.prepare(`
                SELECT p.*, COUNT(v.id) as variant_count
                FROM products_new p
                LEFT JOIN product_variants v ON p.id = v.product_id
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `).all();

            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'POST') {
        const body = await request.json();
        const id = body.id || crypto.randomUUID();

        try {
            await env.DB.prepare(`
                INSERT INTO products_new (id, name, slug, description, category_id, product_type_id, is_active, brand, type, release_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                id,
                body.name,
                body.slug,
                body.description || null,
                body.category_id || null,
                body.product_type_id || null,
                body.is_active ? 1 : 0,
                body.brand || null,
                body.type || 'physical',
                body.release_date || new Date().toISOString()
            ).run();

            if (body.variants && body.variants.length > 0) {
                for (const v of body.variants) {
                    await env.DB.prepare(`
                        INSERT INTO product_variants (id, product_id, name, sku, price, compare_at_price, stock_quantity, image_url, weight, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        crypto.randomUUID(),
                        id,
                        v.name || 'Default',
                        v.sku || null,
                        v.price || 0,
                        v.compare_at_price || null,
                        v.stock_quantity || 0,
                        v.image_url || body.image_url || null,
                        v.weight || null,
                        JSON.stringify(v.metadata || body.metadata || {})
                    ).run();
                }
            }

            return new Response(JSON.stringify({ id, message: "Product created" }), { status: 201 });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'PUT') {
        const id = params.id;
        const body = await request.json();
        if (!id) return new Response("Missing ID", { status: 400 });

        try {
            await env.DB.prepare(`
                UPDATE products_new 
                SET name = ?, slug = ?, description = ?, category_id = ?, product_type_id = ?, is_active = ?, brand = ?, type = ?, release_date = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(
                body.name,
                body.slug,
                body.description || null,
                body.category_id || null,
                body.product_type_id || null,
                body.is_active ? 1 : 0,
                body.brand || null,
                body.type || 'physical',
                body.release_date || null,
                id
            ).run();

            if (body.variants) {
                // Simplified: Delete and re-insert variants for now, or update individually if ID is provided
                // For DJ Flowerz, assuming we replace or sync variants
                await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();
                for (const v of body.variants) {
                    await env.DB.prepare(`
                        INSERT INTO product_variants (id, product_id, name, sku, price, compare_at_price, stock_quantity, currency, image_url, weight, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        v.id || crypto.randomUUID(),
                        id,
                        v.name || 'Default',
                        v.sku || null,
                        v.price || 0,
                        v.compare_at_price || null,
                        v.stock_quantity || 0,
                        v.currency || 'KES',
                        v.image_url || body.image_url || null,
                        v.weight || null,
                        JSON.stringify(v.metadata || body.metadata || {})
                    ).run();
                }
            }

            return new Response(JSON.stringify({ message: "Product updated" }));
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'DELETE') {
        const id = params.id;
        if (!id) return new Response("Missing ID", { status: 400 });

        try {
            await env.DB.prepare("DELETE FROM products_new WHERE id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();
            return new Response(JSON.stringify({ message: "Product deleted" }));
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
}
