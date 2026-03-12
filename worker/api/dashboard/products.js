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
                SELECT p.*, COUNT(v.id) as variant_count, MIN(v.price) as min_price
                FROM products p
                LEFT JOIN product_variants v ON p.id = v.product_id
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `).all();

            return new Response(JSON.stringify(results), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache, must-revalidate"
                }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'POST') {
        const body = await request.json();
        const id = body.id || crypto.randomUUID();
        const slug = body.slug || (body.name || 'unnamed-product').toLowerCase().replace(/[^a-z0-9]/g, '-');

        try {
            const result = await env.DB.prepare(`
                INSERT INTO products (
                    id, name, slug, description, short_description, 
                    category_id, product_type_id, is_active, brand, type, 
                    release_date, image_url, visibility, status, tag_list, os,
                    requires_shipping, track_stock, whatsapp_enabled
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                id,
                body.name,
                slug,
                body.description || null,
                body.shortDescription || body.short_description || null,
                body.category_id || body.category || null,
                body.product_type_id || null,
                body.isActive !== undefined ? (body.isActive ? 1 : 0) : (body.is_active ? 1 : 0),
                body.brand || null,
                body.type || 'physical',
                body.releaseDate || body.release_date || new Date().toISOString(),
                body.image || body.image_url || null,
                body.visibility || 'public',
                body.status || 'published',
                body.tags ? body.tags.join(',') : (body.tag_list || null),
                body.os || null,
                body.requiresShipping !== undefined ? (body.requiresShipping ? 1 : 0) : (body.requires_shipping !== undefined ? (body.requires_shipping ? 1 : 0) : 1),
                body.trackStock !== undefined ? (body.trackStock ? 1 : 0) : (body.track_stock !== undefined ? (body.track_stock ? 1 : 0) : 1),
                body.whatsappEnabled !== undefined ? (body.whatsappEnabled ? 1 : 0) : (body.whatsapp_enabled !== undefined ? (body.whatsapp_enabled ? 1 : 0) : 1)
            ).run();

            console.log('D1 Result (Product INSERT):', result);

            // Ensure at least one variant exists so price/stock is captured
            let variants = body.variants || [];

            // If it's a legacy or simple product without variants array, use top-level fields
            if (variants.length === 0) {
                variants = [{
                    id: crypto.randomUUID(),
                    name: 'Default',
                    price: body.price || 0,
                    compare_at_price: body.compareAtPrice || body.compare_at_price || null,
                    stock_quantity: body.stock !== undefined ? body.stock : (body.inventory !== undefined ? body.inventory : 0),
                    sku: body.sku || null,
                    image_url: body.image || body.image_url || null
                }];
            }

            for (const v of variants) {
                await env.DB.prepare(`
                    INSERT INTO product_variants (id, product_id, name, sku, price, compare_at_price, stock_quantity, image_url, weight, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    v.id || crypto.randomUUID(),
                    id,
                    v.name || 'Default',
                    v.sku || null,
                    v.price || 0,
                    v.compare_at_price || null,
                    v.stock_quantity || 0,
                    v.image_url || body.image || body.image_url || null,
                    v.weight || null,
                    JSON.stringify(v.metadata || {})
                ).run();
            }

            return new Response(JSON.stringify({ id, slug, message: "Product created" }), { status: 201 });
        } catch (e) {
            console.error("[Dashboard Products POST Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'PUT') {
        const id = params.id;
        const body = await request.json();
        if (!id) return new Response("Missing ID", { status: 400 });

        try {
            const result = await env.DB.prepare(`
                UPDATE products 
                SET name = ?, slug = ?, description = ?, short_description = ?, 
                    category_id = ?, product_type_id = ?, is_active = ?, brand = ?, type = ?, 
                    release_date = ?, image_url = ?, visibility = ?, status = ?, tag_list = ?, os = ?,
                    requires_shipping = ?, track_stock = ?, whatsapp_enabled = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(
                body.name,
                body.slug,
                body.description || null,
                body.shortDescription || body.short_description || null,
                body.category_id || body.category || null,
                body.product_type_id || null,
                body.isActive !== undefined ? (body.isActive ? 1 : 0) : (body.is_active ? 1 : 0),
                body.brand || null,
                body.type || 'physical',
                body.releaseDate || body.release_date || null,
                body.image || body.image_url || null,
                body.visibility || 'public',
                body.status || 'published',
                body.tags ? body.tags.join(',') : (body.tag_list || null),
                body.os || null,
                body.requiresShipping !== undefined ? (body.requiresShipping ? 1 : 0) : (body.requires_shipping !== undefined ? (body.requires_shipping ? 1 : 0) : 1),
                body.trackStock !== undefined ? (body.trackStock ? 1 : 0) : (body.track_stock !== undefined ? (body.track_stock ? 1 : 0) : 1),
                body.whatsappEnabled !== undefined ? (body.whatsappEnabled ? 1 : 0) : (body.whatsapp_enabled !== undefined ? (body.whatsapp_enabled ? 1 : 0) : 1),
                id
            ).run();

            console.log('D1 Result (Product UPDATE):', result);

            if (body.variants) {
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
                        v.image_url || body.image || body.image_url || null,
                        v.weight || null,
                        JSON.stringify(v.metadata || {})
                    ).run();
                }
            } else if (body.price !== undefined) {
                // If it's a simple update without a variants array but has price/stock, update the default variant
                await env.DB.prepare(`
                    UPDATE product_variants 
                    SET price = ?, compare_at_price = ?, stock_quantity = ?, image_url = ?
                    WHERE product_id = ? AND name = 'Default'
                `).bind(
                    body.price,
                    body.compareAtPrice || body.compare_at_price || null,
                    body.stock !== undefined ? body.stock : (body.inventory !== undefined ? body.inventory : 0),
                    body.image || body.image_url || null,
                    id
                ).run();
            }

            return new Response(JSON.stringify({ message: "Product updated" }));
        } catch (e) {
            console.error("[Dashboard Products PUT Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'DELETE') {
        const id = params.id;
        if (!id) return new Response("Missing ID", { status: 400 });

        try {
            const result1 = await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
            const result2 = await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();
            console.log('D1 Result (Product DELETE):', result1, result2);
            return new Response(JSON.stringify({ message: "Product deleted" }));
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
}
