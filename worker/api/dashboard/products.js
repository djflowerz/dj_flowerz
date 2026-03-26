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
                SELECT *, image as image_url FROM products ORDER BY created_at DESC
            `).all();

            // Fetch variants for each product and parse JSON fields
            const productsWithVariants = await Promise.all(results.map(async (p) => {
                const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants WHERE product_id = ?")
                    .bind(p.id)
                    .all();
                
                return { 
                    ...p, 
                    variants: variants || [],
                    technicalDetails: p.technical_details ? JSON.parse(p.technical_details) : [],
                    hotspots: p.hotspots ? JSON.parse(p.hotspots) : [],
                    useCases: p.use_cases ? JSON.parse(p.use_cases) : [],
                    variantGroups: p.variant_groups ? JSON.parse(p.variant_groups) : [],
                    images: p.images ? JSON.parse(p.images) : []
                };
            }));

            return new Response(JSON.stringify(productsWithVariants), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache, must-revalidate"
                }
            });
        } catch (e) {
            console.error("[Dashboard Products GET Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'POST') {
        try {
            const body = await request.json();
            const id = body.id || `p${Date.now()}`;
            
            // Map frontend fields to D1 schema
            const status = body.status === 'published' || body.status === 'active' || body.isActive === true || body.is_active === true ? 'published' : (body.status || 'draft');
            const isActive = (status === 'published') ? 1 : 0;
            const compareAtPrice = body.compareAtPrice || body.compare_at_price || body.discountPrice || body.discount_price || null;
            const releaseDate = body.releaseDate || body.release_date || null;
            const logistics = body.logistics || body.standard_logistics || (body.requiresShipping ? 'Standard Logistics' : null);
            const description = body.description || body.short_description || null;
            const image = body.image || body.image_url || null;
            const category = body.category || body.category_id || 'Uncategorized';
            const inventory = body.inventory || body.stock_quantity || body.stock || 0;
            const technicalDetails = body.technicalDetails || body.technical_details ? JSON.stringify(body.technicalDetails || body.technical_details) : null;
            const hotspots = body.hotspots ? JSON.stringify(body.hotspots) : null;
            const useCases = body.useCases || body.use_cases ? JSON.stringify(body.useCases || body.use_cases) : null;
            const variantGroups = body.variantGroups || body.variant_groups ? JSON.stringify(body.variantGroups || body.variant_groups) : null;
            const isHot = body.isHot || body.is_hot || false;
            const isFeatured = body.isFeatured || body.is_featured || false;
            const isBestSeller = body.isBestSeller || body.is_best_seller || false;
            const isSpecialOffer = body.isSpecialOffer || body.is_special_offer || false;
            const isTrending = body.isTrending || body.is_trending || false;
            const offerExpiry = body.offerExpiry || body.offer_expiry || null;
            const sku = body.sku || null;
            const weight = body.weight || null;
            const dimensions = body.dimensions || null;
            const shippingSize = body.shippingSize || body.shipping_size || 'medium';
            const features = body.features ? (Array.isArray(body.features) ? JSON.stringify(body.features) : body.features) : null;

            const requiresShipping = body.requiresShipping !== undefined ? (body.requiresShipping ? 1 : 0) : (body.requires_shipping !== undefined ? (body.requires_shipping ? 1 : 0) : (body.type === 'physical' ? 1 : 0));
            const whatsappEnabled = body.whatsappEnabled !== undefined ? (body.whatsappEnabled ? 1 : 0) : (body.whatsapp_enabled !== undefined ? (body.whatsapp_enabled ? 1 : 0) : 1);
            const digitalFileUrl = body.digitalFileUrl || body.digital_file_url || null;
            const downloadPassword = body.downloadPassword || body.download_password || null;
            const currency = body.currency || 'KES';
            const videoUrl = body.videoUrl || body.video_url || null;
            const visibility = body.visibility || 'public';
            const os = body.os || 'None';

            await env.DB.prepare(`
                INSERT INTO products (
                    id, name, description, price, image, category, inventory, stock, created_at, 
                    brand, compare_at_price, status, is_active, release_date, logistics, 
                    slug, technical_details, hotspots, use_cases, variant_groups, type, 
                    is_hot, is_featured, is_best_seller, is_special_offer, is_trending, offer_expiry, sku, images,
                    weight, dimensions, features, shipping_size,
                    requires_shipping, whatsapp_enabled, digital_file_url, download_password, currency, video_url, visibility, os
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                id,
                body.name || 'Unnamed Product',
                description,
                body.price || 0,
                image,
                category,
                inventory,
                inventory, // Use same value for stock
                new Date().toISOString(),
                body.brand || null,
                compareAtPrice,
                status,
                isActive,
                releaseDate,
                logistics,
                body.slug || (body.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                technicalDetails,
                hotspots,
                useCases,
                variantGroups,
                body.type || 'physical',
                isHot ? 1 : 0,
                isFeatured ? 1 : 0,
                isBestSeller ? 1 : 0,
                isSpecialOffer ? 1 : 0,
                isTrending ? 1 : 0,
                offerExpiry,
                sku,
                body.images ? JSON.stringify(body.images) : null,
                weight,
                dimensions,
                features,
                shippingSize,
                requiresShipping,
                whatsappEnabled,
                digitalFileUrl,
                downloadPassword,
                currency,
                videoUrl,
                visibility,
                os
            ).run();

            // Handle variants
            if (body.variants && Array.isArray(body.variants)) {
                for (const v of body.variants) {
                    const vCompareAt = v.compare_at_price || v.compareAtPrice || v.discount_price || v.discountPrice || null;
                    await env.DB.prepare(`
                        INSERT INTO product_variants (id, product_id, name, price, compare_at_price, inventory, image_url, sku)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        v.id || `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        id,
                        v.name || 'Default',
                        v.price || 0,
                        vCompareAt,
                        v.inventory || v.stock_quantity || v.stock || 0,
                        v.image_url || v.image || null,
                        v.sku || null
                    ).run();
                }
            }

            return new Response(JSON.stringify({ id, message: "Product created" }), { status: 201 });
        } catch (e) {
            console.error("[Dashboard Products POST Error]", e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    if (method === 'PUT') {
        const id = params.id;
        if (!id) return new Response("Missing ID", { status: 400 });
        
        try {
            const body = await request.json();
            
            // Map frontend fields to D1 schema
            const status = body.status === 'published' || body.status === 'active' || body.isActive === true || body.is_active === true ? 'published' : (body.status || 'draft');
            const isActive = (status === 'published') ? 1 : 0;
            const compareAtPrice = body.compare_at_price || body.compareAtPrice || body.discount_price || body.discountPrice || null;
            const releaseDate = body.release_date || body.releaseDate || null;
            const logistics = body.logistics || body.standard_logistics || (body.requiresShipping ? 'Standard Logistics' : null);
            const description = body.description || body.short_description || null;
            const image = body.image || body.image_url || null;
            const category = body.category || body.category_id || 'Uncategorized';
            const inventory = body.inventory || body.stock_quantity || body.stock || 0;
            const technicalDetails = body.technicalDetails || body.technical_details ? JSON.stringify(body.technicalDetails || body.technical_details) : null;
            const hotspots = body.hotspots ? JSON.stringify(body.hotspots) : null;
            const useCases = body.useCases || body.use_cases ? JSON.stringify(body.useCases || body.use_cases) : null;
            const variantGroups = body.variantGroups || body.variant_groups ? JSON.stringify(body.variantGroups || body.variant_groups) : null;
            const isHot = body.isHot || body.is_hot || false;
            const isFeatured = body.isFeatured || body.is_featured || false;
            const isBestSeller = body.isBestSeller || body.is_best_seller || false;
            const isSpecialOffer = body.isSpecialOffer || body.is_special_offer || false;
            const isTrending = body.isTrending || body.is_trending || false;
            const offerExpiry = body.offerExpiry || body.offer_expiry || null;
            const sku = body.sku || null;
            const weight = body.weight || null;
            const dimensions = body.dimensions || null;
            const shippingSize = body.shippingSize || body.shipping_size || 'medium';
            const features = body.features ? (Array.isArray(body.features) ? JSON.stringify(body.features) : body.features) : null;

            const requiresShipping = body.requiresShipping !== undefined ? (body.requiresShipping ? 1 : 0) : (body.requires_shipping !== undefined ? (body.requires_shipping ? 1 : 0) : (body.type === 'physical' ? 1 : 0));
            const whatsappEnabled = body.whatsappEnabled !== undefined ? (body.whatsappEnabled ? 1 : 0) : (body.whatsapp_enabled !== undefined ? (body.whatsapp_enabled ? 1 : 0) : 1);
            const digitalFileUrl = body.digitalFileUrl || body.digital_file_url || null;
            const downloadPassword = body.downloadPassword || body.download_password || null;
            const currency = body.currency || 'KES';
            const videoUrl = body.videoUrl || body.video_url || null;
            const visibility = body.visibility || 'public';
            const os = body.os || 'None';

            await env.DB.prepare(`
                UPDATE products 
                SET name = ?, description = ?, price = ?, image = ?, category = ?, inventory = ?, stock = ?, 
                    brand = ?, compare_at_price = ?, status = ?, is_active = ?, release_date = ?, logistics = ?, slug = ?,
                    technical_details = ?, hotspots = ?, use_cases = ?, variant_groups = ?, type = ?,
                    is_hot = ?, is_featured = ?, is_best_seller = ?, is_special_offer = ?, is_trending = ?, offer_expiry = ?, sku = ?, images = ?, weight = ?, dimensions = ?, features = ?, shipping_size = ?,
                    requires_shipping = ?, whatsapp_enabled = ?, digital_file_url = ?, download_password = ?, currency = ?, video_url = ?, visibility = ?, os = ?
                WHERE id = ?
            `).bind(
                body.name,
                description,
                body.price || 0,
                image,
                category,
                inventory,
                inventory, // Use same value for stock
                body.brand || null,
                compareAtPrice,
                status,
                isActive,
                releaseDate,
                logistics,
                body.slug || (body.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                technicalDetails,
                hotspots,
                useCases,
                variantGroups,
                body.type || 'physical',
                isHot ? 1 : 0,
                isFeatured ? 1 : 0,
                isBestSeller ? 1 : 0,
                isSpecialOffer ? 1 : 0,
                isTrending ? 1 : 0,
                offerExpiry,
                sku,
                body.images ? JSON.stringify(body.images) : null,
                weight,
                dimensions,
                features,
                shippingSize,
                requiresShipping,
                whatsappEnabled,
                digitalFileUrl,
                downloadPassword,
                currency,
                videoUrl,
                visibility,
                os,
                id
            ).run();

            // Refresh variants: Delete and Re-insert
            await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();
            
            if (body.variants && Array.isArray(body.variants)) {
                for (const v of body.variants) {
                    const vCompareAt = v.compare_at_price || v.compareAtPrice || v.discount_price || v.discountPrice || null;
                    await env.DB.prepare(`
                        INSERT INTO product_variants (id, product_id, name, price, compare_at_price, inventory, image_url, sku)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        v.id || `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        id,
                        v.name || 'Default',
                        v.price || 0,
                        vCompareAt,
                        v.inventory || v.stock_quantity || v.stock || 0,
                        v.image_url || v.image || null,
                        v.sku || null
                    ).run();
                }
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
            await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();
            return new Response(JSON.stringify({ message: "Product deleted" }));
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
}
