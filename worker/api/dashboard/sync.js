// worker/api/dashboard/sync.js

export async function handleR2Upload(request, env, ctx, params) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const rawFileName = request.headers.get("x-file-name") || `upload_${Date.now()}`;
        // Decode any URL-encoded characters, then sanitize for R2 key safety
        const decodedName = decodeURIComponent(rawFileName);
        const safeFileName = decodedName.replace(/[^a-zA-Z0-9._\-]/g, '_');
        const folder = request.headers.get("x-folder") || 'uploads';
        const contentType = request.headers.get("content-type") || "application/octet-stream";
        const key = `${folder}/${safeFileName}`;

        // Stream the request body directly to R2 for better memory efficiency with large files
        await env.R2_BUCKET.put(key, request.body, {
            httpMetadata: { contentType }
        });

        const publicDomain = env.PUBLIC_R2_DOMAIN || 'pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev';
        return new Response(JSON.stringify({
            success: true,
            url: `https://${publicDomain}/${key}`,
            key: key
        }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleR2Sync(request, env, ctx, params) { // Verify admin authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    try {
        const bodyBytes = await request.text();
        // Ensure we handle huge JSON bodies safely
        const body = JSON.parse(bodyBytes);

        const { collection, data, action, item, id, items, ids } = body;

        if (!collection) {
            return new Response(JSON.stringify({ error: "Missing collection" }), { status: 400 });
        }

        const key = `data/${collection}.json`;

        if (action) {
            let existingData = [];
            try {
                const obj = await env.R2_BUCKET.get(key);
                if (obj) {
                    const text = await obj.text();
                    existingData = JSON.parse(text);
                }
            } catch (err) {
                // ignore if doesn't exist
            }

            if (action === 'importFromR2') {
                const obj = await env.R2_BUCKET.get('data/products.json');
                if (!obj) {
                    return new Response(JSON.stringify({ error: "products.json not found in R2" }), { status: 404 });
                }
                const products = JSON.parse(await obj.text());
                
                // Use a transaction for bulk upsert
                const queries = [];
                for (const p of products) {
                    queries.push(env.DB.prepare(`
                        INSERT INTO products (
                            id, name, slug, type, price, sale_price, description, short_description,
                            category, inventory, is_featured, is_active, image, images,
                            requires_shipping, digital_file_url, download_password, visibility,
                            is_free, meta_title, meta_description, discount_price, tags,
                            track_inventory, has_variants, low_stock_threshold, shipping_class,
                            secure_download_link, download_limit, expiry_days, allow_redownload,
                            whatsapp_enabled, compare_at_price, currency, is_hot, video_url,
                            features, technical_details, use_cases,
                            image_alt, track_stock, size, og_image, condition, rating,
                            comments_count, shares_count, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            name=excluded.name, slug=excluded.slug, type=excluded.type, price=excluded.price,
                            sale_price=excluded.sale_price, description=excluded.description,
                            short_description=excluded.short_description, category=excluded.category,
                            inventory=excluded.inventory, is_featured=excluded.is_featured,
                            is_active=excluded.is_active, image=excluded.image, images=excluded.images,
                            requires_shipping=excluded.requires_shipping, digital_file_url=excluded.digital_file_url,
                            download_password=excluded.download_password, visibility=excluded.visibility,
                            is_free=excluded.is_free, meta_title=excluded.meta_title,
                            meta_description=excluded.meta_description, discount_price=excluded.discount_price,
                            tags=excluded.tags, track_inventory=excluded.track_inventory,
                            has_variants=excluded.has_variants, low_stock_threshold=excluded.low_stock_threshold,
                            shipping_class=excluded.shipping_class, secure_download_link=excluded.secure_download_link,
                            download_limit=excluded.download_limit, expiry_days=excluded.expiry_days,
                            allow_redownload=excluded.allow_redownload, whatsapp_enabled=excluded.whatsapp_enabled,
                            compare_at_price=excluded.compare_at_price, currency=excluded.currency,
                            is_hot=excluded.is_hot, video_url=excluded.video_url, 
                            features=excluded.features, technical_details=excluded.technical_details, 
                            use_cases=excluded.use_cases,
                            image_alt=excluded.image_alt,
                            track_stock=excluded.track_stock, size=excluded.size, og_image=excluded.og_image,
                            condition=excluded.condition, rating=excluded.rating,
                            comments_count=excluded.comments_count, shares_count=excluded.shares_count,
                            updated_at=excluded.updated_at
                    `).bind(
                        p.id, p.name, p.slug, p.type, p.price, p.sale_price, p.description, p.short_description,
                        p.category, p.inventory, p.is_featured ? 1 : 0, p.is_active ? 1 : 0, p.image, JSON.stringify(p.images),
                        p.requires_shipping ? 1 : 0, p.digital_file_url, p.download_password, p.visibility,
                        p.is_free ? 1 : 0, p.meta_title, p.meta_description, p.discount_price, p.tags,
                        p.track_inventory ? 1 : 0, p.has_variants ? 1 : 0, p.low_stock_threshold, p.shipping_class,
                        p.secure_download_link, p.download_limit, p.expiry_days, p.allow_redownload ? 1 : 0,
                        p.whatsapp_enabled ? 1 : 0, p.compare_at_price, p.currency, p.is_hot ? 1 : 0, p.video_url,
                        JSON.stringify(p.features || []), JSON.stringify(p.technical_details || []), JSON.stringify(p.use_cases || []),
                        p.image_alt, p.track_stock ? 1 : 0, p.size, p.og_image, p.condition, p.rating || 0,
                        p.comments_count || 0, p.shares_count || 0, p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()
                    ));

                    if (p.variants && Array.isArray(p.variants)) {
                        for (const v of p.variants) {
                            queries.push(env.DB.prepare(`
                                INSERT INTO product_variants (
                                    id, product_id, name, sku, price, sale_price, inventory,
                                    image, is_active, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(id) DO UPDATE SET
                                    product_id=excluded.product_id, name=excluded.name, sku=excluded.sku,
                                    price=excluded.price, sale_price=excluded.sale_price,
                                    inventory=excluded.inventory, image=excluded.image,
                                    is_active=excluded.is_active, updated_at=excluded.updated_at
                            `).bind(
                                v.id, p.id, v.name, v.sku, v.price, v.sale_price, v.inventory,
                                v.image, v.is_active ? 1 : 0, v.created_at || new Date().toISOString(), v.updated_at || new Date().toISOString()
                            ));
                        }
                    }
                }

                // Execute all queries in a single batch
                if (queries.length > 0) {
                    await env.DB.batch(queries);
                }

                return new Response(JSON.stringify({ 
                    success: true, 
                    message: `Imported ${products.length} products and their variants from R2 to D1` 
                }), { headers: { "Content-Type": "application/json" } });
            }

            if (action === 'add' && item) {
                existingData.unshift(item);
            } else if (action === 'addBatch' && Array.isArray(items)) {
                existingData = [...items, ...existingData];
            } else if (action === 'deleteBatch' && Array.isArray(ids)) {
                const idSet = new Set(ids);
                existingData = existingData.filter(i => !idSet.has(i.id));
            } else if (action === 'update' && item && id) {
                const idx = existingData.findIndex(i => i.id === id);
                if (idx !== -1) existingData[idx] = { ...existingData[idx], ...item };
                else existingData.unshift({ ...item, id });
            } else if (action === 'delete' && id) {
                existingData = existingData.filter(i => i.id !== id);
            }

            // Deduplication Step
            const seenIds = new Set();
            existingData = existingData.filter(i => {
                if (!i.id) return true;
                if (seenIds.has(i.id)) return false;
                seenIds.add(i.id);
                return true;
            });

            await env.R2_BUCKET.put(key, JSON.stringify(existingData), {
                httpMetadata: { contentType: "application/json" }
            });

            return new Response(JSON.stringify({ success: true, message: `Synced ${collection} via ${action}` }), { headers: { "Content-Type": "application/json" } });
        } else if (data) {
            // Full replace
            await env.R2_BUCKET.put(key, JSON.stringify(data), {
                httpMetadata: { contentType: "application/json" }
            });
            return new Response(JSON.stringify({ success: true, message: `Replaced ${collection} to R2` }), { headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ error: "Must provide data or action" }), { status: 400 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
