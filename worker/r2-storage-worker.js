
/**
 * Unified Cloudflare Worker for DJ Flowerz (D1 + R2 + KV + Vectorize)
 * 
 * Features:
 * - D1: Structured data (products, mixtapes, profiles)
 * - R2: Assets (images, audio)
 * - KV: Configuration, Sessions, A/B Testing
 * - Vectorize: AI Semantic Search
 * - Workers AI: Generating embeddings for Vector search
 */

async function syncProductsToR2(env) {
    try {
        const { results } = await env.DB.prepare("SELECT * FROM products").all();
        // Parse JSON strings back to objects for the static file
        const formattedResults = results.map(p => {
            let images = p.images;
            try {
                if (typeof images === 'string') images = JSON.parse(images);
            } catch (e) { }

            let variantGroups = p.variant_groups;
            try {
                if (typeof variantGroups === 'string') variantGroups = JSON.parse(variantGroups);
            } catch (e) { }

            return {
                ...p,
                images: Array.isArray(images) ? images : (p.image ? [p.image] : []),
                variantGroups: Array.isArray(variantGroups) ? variantGroups : [],
                discountPrice: p.discount_price,
                compareAtPrice: p.compare_at_price,
                requiresShipping: Boolean(p.requires_shipping),
                whatsappEnabled: Boolean(p.whatsapp_enabled),
                isFree: Boolean(p.is_free),
                releaseDate: p.release_date
            };
        });

        await env.R2_BUCKET.put("data/products.json", JSON.stringify(formattedResults), {
            httpMetadata: { contentType: "application/json" }
        });
        console.log(`[Worker] Synced ${formattedResults.length} products to R2 data/products.json`);
    } catch (error) {
        console.error("[Worker] Failed to sync products to R2:", error);
    }
}

async function syncCollectionToR2(env, collectionName, query, formatter = (res) => res) {
    try {
        const { results } = await env.DB.prepare(query).all();
        const formattedResults = formatter(results);
        await env.R2_BUCKET.put(`data/${collectionName}.json`, JSON.stringify(formattedResults), {
            httpMetadata: { contentType: "application/json" }
        });
        console.log(`[Worker] Synced ${formattedResults.length} items to R2 data/${collectionName}.json`);
    } catch (error) {
        console.error(`[Worker] Failed to sync ${collectionName} to R2:`, error);
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // --- 1. CORS Pre-flight ---
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-folder, x-file-name",
        };

        if (method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // --- 2. CONFIGURATION & DATA (KV/R2) ---
            if (path === "/api/config") {
                const config = await env.KV.get("SITE_CONFIG");
                return new Response(config || "{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // --- PUBLIC FILE PROXY: GET /files/* ---
            // Serves track media (mp3, mp4, etc.) from r2.vicknickvideopool.com
            // via the djflowerz worker so all media uses the djflowerz domain.
            if (method === "GET" && path.startsWith("/files/")) {
                const filePath = path.replace("/files/", "");
                const originUrl = `https://r2.vicknickvideopool.com/${filePath}${url.search}`;

                const originRes = await fetch(originUrl, {
                    headers: {
                        "User-Agent": "DJFlowerz-Worker/1.0",
                        "Referer": "https://djflowerz.co.ke"
                    }
                });

                const headers = new Headers(corsHeaders);
                headers.set("Content-Type", originRes.headers.get("Content-Type") || "application/octet-stream");
                headers.set("Cache-Control", "public, max-age=86400"); // 1 day cache
                headers.set("Accept-Ranges", "bytes");

                // Pass through Content-Length and Content-Range for proper video seeking
                const contentLength = originRes.headers.get("Content-Length");
                const contentRange = originRes.headers.get("Content-Range");
                if (contentLength) headers.set("Content-Length", contentLength);
                if (contentRange) headers.set("Content-Range", contentRange);

                return new Response(originRes.body, {
                    status: originRes.status,
                    headers
                });
            }

            // Public Data Fetch: GET /api/data/:collection.json
            if (method === "GET" && path.startsWith("/api/data/")) {
                let collection = path.replace("/api/data/", "");
                // Ensure we handle both "products" and "products.json" reliably
                if (collection.endsWith(".json")) {
                    collection = collection.replace(".json", "");
                }

                const key = `data/${collection}.json`;
                console.log(`[Worker] Fetching from R2: ${key}`);

                const obj = await env.R2_BUCKET.get(key);
                if (!obj) {
                    console.warn(`[Worker] Not found in R2: ${key}`);
                    return new Response(JSON.stringify([]), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                        status: 200 // Return empty array instead of 404 for frontend stability
                    });
                }

                const body = await obj.arrayBuffer();
                return new Response(body, {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "Cache-Control": "public, max-age=10" // Reduced cache for easier debugging
                    }
                });
            }

            // --- 3. PRODUCTS & MIXTAPES (D1) ---
            // Fetch All Products: GET /api/products
            if (method === "GET" && path === "/api/products") {
                const { results } = await env.DB.prepare("SELECT * FROM products WHERE is_active = 1").all();
                return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Add Product: POST /api/products
            if (method === "POST" && path === "/api/products") {
                const product = await request.json();
                const productId = product.id || `prod_${Date.now()}`;

                await env.DB.prepare(`
                    INSERT INTO products (
                        id, name, description, price, category, image, images, inventory, currency, 
                        discount_price, compare_at_price, type, brand, release_date, status, 
                        requires_shipping, weight, dimensions, sku, variant_groups, 
                        whatsapp_enabled, is_free, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `).bind(
                    productId ?? null,
                    product.name ?? null,
                    product.description ?? null,
                    product.price ?? null,
                    product.category ?? null,
                    product.image ?? null,
                    product.images ? JSON.stringify(product.images) : JSON.stringify([product.image ?? null]),
                    product.inventory ?? null,
                    product.currency || 'KES',
                    product.discountPrice ?? null,
                    product.compareAtPrice ?? null,
                    product.type || 'physical',
                    product.brand ?? null,
                    product.releaseDate ?? null,
                    product.status || 'draft',
                    product.requiresShipping ? 1 : 0,
                    product.weight ?? null,
                    product.dimensions ?? null,
                    product.sku ?? null,
                    product.variantGroups ? JSON.stringify(product.variantGroups) : '[]',
                    product.whatsappEnabled !== false ? 1 : 0,
                    product.isFree ? 1 : 0
                ).run();

                // Vectorize: Generate embedding for semantic search
                if (env.AI && env.VECTOR_INDEX) {
                    const textToEmbed = `${product.name}: ${product.description || ''}`;
                    try {
                        const embeddingResponse = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [textToEmbed] });
                        const vector = embeddingResponse.data[0];
                        await env.VECTOR_INDEX.upsert([{ id: productId, values: vector, metadata: { name: product.name, type: 'product' } }]);
                    } catch (e) {
                        console.error("[Worker] Vectorize failed for product:", e);
                    }
                }

                // Sync D1 to static R2 file so frontend sees it
                await syncProductsToR2(env);

                return Response.json({ success: true, id: productId }, { headers: corsHeaders });
            }

            // Update Product: PUT /api/products/:id
            if (method === "PUT" && path.startsWith("/api/products/")) {
                const {
                    name, description, price, category, image, images, inventory,
                    is_active, is_featured, currency, discountPrice, compareAtPrice,
                    type, brand, releaseDate, status, requiresShipping, weight,
                    dimensions, sku, variantGroups, whatsappEnabled, isFree
                } = data;

                await env.DB.prepare(
                    `UPDATE products SET 
                        name = COALESCE(?, name),
                        description = COALESCE(?, description),
                        price = COALESCE(?, price),
                        category = COALESCE(?, category),
                        image = COALESCE(?, image),
                        images = COALESCE(?, images),
                        inventory = COALESCE(?, inventory),
                        is_active = COALESCE(?, is_active),
                        is_featured = COALESCE(?, is_featured),
                        currency = COALESCE(?, currency),
                        discount_price = COALESCE(?, discount_price),
                        compare_at_price = COALESCE(?, compare_at_price),
                        type = COALESCE(?, type),
                        brand = COALESCE(?, brand),
                        release_date = COALESCE(?, release_date),
                        status = COALESCE(?, status),
                        requires_shipping = COALESCE(?, requires_shipping),
                        weight = COALESCE(?, weight),
                        dimensions = COALESCE(?, dimensions),
                        sku = COALESCE(?, sku),
                        variant_groups = COALESCE(?, variant_groups),
                        whatsapp_enabled = COALESCE(?, whatsapp_enabled),
                        is_free = COALESCE(?, is_free),
                        updated_at = datetime('now')
                     WHERE id = ?`
                ).bind(
                    name,
                    description,
                    price,
                    category,
                    image,
                    images ? JSON.stringify(images) : null,
                    inventory,
                    is_active !== undefined ? (is_active ? 1 : 0) : null,
                    is_featured !== undefined ? (is_featured ? 1 : 0) : null,
                    currency,
                    discountPrice,
                    compareAtPrice,
                    type,
                    brand,
                    releaseDate,
                    status,
                    requiresShipping !== undefined ? (requiresShipping ? 1 : 0) : null,
                    weight,
                    dimensions,
                    sku,
                    variantGroups ? JSON.stringify(variantGroups) : null,
                    whatsappEnabled !== undefined ? (whatsappEnabled ? 1 : 0) : null,
                    isFree !== undefined ? (isFree ? 1 : 0) : null,
                    productId
                ).run();

                // Sync D1 to static R2 file so frontend sees it
                await syncProductsToR2(env);

                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Delete Product: DELETE /api/products/:id
            if (method === "DELETE" && path.startsWith("/api/products/")) {
                const productId = path.replace("/api/products/", "");
                await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
                await syncProductsToR2(env);
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // --- MIXTAPES (D1) ---
            // Fetch All Mixtapes: GET /api/mixtapes
            if (method === "GET" && path === "/api/mixtapes") {
                const { results } = await env.DB.prepare("SELECT * FROM mixtapes ORDER BY created_at DESC").all();
                const formattedResults = results.map(m => {
                    let tags = m.tags;
                    try { if (typeof tags === 'string') tags = JSON.parse(tags); } catch (e) { tags = []; }
                    return {
                        ...m,
                        tags: Array.isArray(tags) ? tags : [],
                        // Map snake_case → camelCase so frontend receives expected field names
                        coverUrl: m.cover_url || m.cover_image || '',
                        audioUrl: m.audio_url || '',
                        downloadUrl: m.download_url || '',
                        releaseDate: m.release_date || '',
                        isFeatured: !!m.is_featured,
                        requiredTier: m.required_tier || 'free',
                    };
                });
                return new Response(JSON.stringify(formattedResults), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Add Mixtape: POST /api/mixtapes
            if (method === "POST" && path === "/api/mixtapes") {
                const mx = await request.json();
                const mxId = mx.id || `mixtape_${Date.now()}`;

                const coverUrl = mx.coverUrl || mx.cover_url || mx.coverImage || mx.cover_image || null;
                const audioUrl = mx.audioUrl || mx.audio_url || null;

                await env.DB.prepare(`
                    INSERT INTO mixtapes (
                        id, title, description, cover_url, audio_url, duration, genre, tags, is_featured, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `).bind(
                    mxId ?? null,
                    mx.title ?? null,
                    mx.description ?? null,
                    coverUrl,
                    audioUrl,
                    mx.duration ?? null,
                    mx.genre ?? null,
                    mx.tags ? JSON.stringify(mx.tags) : '[]',
                    mx.isFeatured !== undefined ? (mx.isFeatured ? 1 : 0) : 0
                ).run();

                await syncCollectionToR2(env, 'mixtapes', "SELECT * FROM mixtapes ORDER BY created_at DESC", (results) => {
                    return results.map(m => {
                        let tags = m.tags;
                        try { if (typeof tags === 'string') tags = JSON.parse(tags); } catch (e) { tags = []; }
                        return { ...m, coverImage: m.cover_image, audioUrl: m.audio_url, isFeatured: Boolean(m.is_featured), tags: Array.isArray(tags) ? tags : [] };
                    });
                });
                return Response.json({ success: true, id: mxId }, { headers: corsHeaders });
            }

            // Update Mixtape: PUT /api/mixtapes/:id
            if (method === "PUT" && path.startsWith("/api/mixtapes/")) {
                const mxId = path.replace("/api/mixtapes/", "");
                const data = await request.json();

                await env.DB.prepare(`
                    UPDATE mixtapes SET 
                        title = COALESCE(?, title),
                        description = COALESCE(?, description),
                        cover_url = COALESCE(?, cover_url),
                        audio_url = COALESCE(?, audio_url),
                        duration = COALESCE(?, duration),
                        genre = COALESCE(?, genre),
                        tags = COALESCE(?, tags),
                        is_featured = COALESCE(?, is_featured),
                        updated_at = datetime('now')
                     WHERE id = ?
                `).bind(
                    data.title ?? null,
                    data.description ?? null,
                    (data.coverUrl || data.cover_url || data.coverImage || data.cover_image) ?? null,
                    (data.audioUrl || data.audio_url) ?? null,
                    data.duration ?? null,
                    data.genre ?? null,
                    data.tags ? JSON.stringify(data.tags) : null,
                    data.isFeatured !== undefined ? (data.isFeatured ? 1 : 0) : null,
                    mxId
                ).run();

                await syncCollectionToR2(env, 'mixtapes', "SELECT * FROM mixtapes ORDER BY created_at DESC", (results) => {
                    return results.map(m => {
                        let tags = m.tags;
                        try { if (typeof tags === 'string') tags = JSON.parse(tags); } catch (e) { tags = []; }
                        return { ...m, coverUrl: m.cover_url || m.cover_image || '', audioUrl: m.audio_url || '', isFeatured: Boolean(m.is_featured), tags: Array.isArray(tags) ? tags : [] };
                    });
                });
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Delete Mixtape: DELETE /api/mixtapes/:id
            if (method === "DELETE" && path.startsWith("/api/mixtapes/")) {
                const mxId = path.replace("/api/mixtapes/", "");
                await env.DB.prepare("DELETE FROM mixtapes WHERE id = ?").bind(mxId).run();
                await syncCollectionToR2(env, 'mixtapes', "SELECT * FROM mixtapes ORDER BY created_at DESC", (results) => {
                    return results.map(m => {
                        let tags = m.tags;
                        try { if (typeof tags === 'string') tags = JSON.parse(tags); } catch (e) { tags = []; }
                        return { ...m, coverImage: m.cover_image, audioUrl: m.audio_url, isFeatured: Boolean(m.is_featured), tags: Array.isArray(tags) ? tags : [] };
                    });
                });
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // --- ORDERS (D1) ---
            if (method === "GET" && path === "/api/orders") {
                const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
                const formatted = results.map(o => ({ ...o, items: o.items ? JSON.parse(o.items) : [] }));
                return Response.json(formatted, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/orders") {
                const order = await request.json();
                const orderId = order.id || `order_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO orders (id, user_id, total_amount, status, items, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `).bind(
                    orderId, order.userId || order.user_id, order.totalAmount || order.total_amount, order.status || 'pending', JSON.stringify(order.items || [])
                ).run();
                await syncCollectionToR2(env, 'orders', "SELECT * FROM orders ORDER BY created_at DESC", res => res.map(o => ({ ...o, userId: o.user_id, totalAmount: o.total_amount, items: o.items ? JSON.parse(o.items) : [] })));
                return Response.json({ success: true, id: orderId }, { headers: corsHeaders });
            }

            if (method === "PUT" && path.startsWith("/api/orders/")) {
                const orderId = path.replace("/api/orders/", "");
                const data = await request.json();
                await env.DB.prepare(`
                    UPDATE orders SET status = COALESCE(?, status) WHERE id = ?
                `).bind(data.status, orderId).run();
                await syncCollectionToR2(env, 'orders', "SELECT * FROM orders ORDER BY created_at DESC", res => res.map(o => ({ ...o, userId: o.user_id, totalAmount: o.total_amount, items: o.items ? JSON.parse(o.items) : [] })));
                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // --- PROFILES (D1) ---
            if (method === "GET" && path === "/api/profiles") {
                const { results } = await env.DB.prepare("SELECT * FROM profiles").all();
                return Response.json(results, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/profiles") {
                const prf = await request.json();
                await env.DB.prepare(`
                    INSERT INTO profiles (id, email, full_name, avatar_url, role, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    ON CONFLICT(id) DO UPDATE SET
                    email = excluded.email, full_name = excluded.full_name, avatar_url = excluded.avatar_url, role = excluded.role, updated_at = datetime('now')
                `).bind(
                    prf.id, prf.email, prf.fullName || prf.full_name, prf.avatarUrl || prf.avatar_url, prf.role || 'user'
                ).run();
                await syncCollectionToR2(env, 'profiles', "SELECT * FROM profiles", res => res.map(p => ({ ...p, fullName: p.full_name, avatarUrl: p.avatar_url })));
                return Response.json({ success: true, id: prf.id }, { headers: corsHeaders });
            }

            if (method === "PUT" && path.startsWith("/api/profiles/")) {
                const prfId = path.replace("/api/profiles/", "");
                const data = await request.json();
                await env.DB.prepare(`
                    UPDATE profiles SET 
                        email = COALESCE(?, email),
                        full_name = COALESCE(?, full_name),
                        avatar_url = COALESCE(?, avatar_url),
                        role = COALESCE(?, role),
                        updated_at = datetime('now')
                    WHERE id = ?
                `).bind(data.email, data.fullName || data.full_name, data.avatarUrl || data.avatar_url, data.role, prfId).run();
                await syncCollectionToR2(env, 'profiles', "SELECT * FROM profiles", res => res.map(p => ({ ...p, fullName: p.full_name, avatarUrl: p.avatar_url })));
                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // --- SUBSCRIPTIONS (D1) ---
            if (method === "GET" && path === "/api/subscriptions") {
                const { results } = await env.DB.prepare("SELECT * FROM subscriptions").all();
                return Response.json(results, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/subscriptions") {
                const sub = await request.json();
                const subId = sub.id || `sub_${Date.now()}`;

                // create table if not exists (to be safe if they didn't add it)
                await env.DB.prepare(`
                    CREATE TABLE IF NOT EXISTS subscriptions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT,
                        plan_id TEXT,
                        status TEXT,
                        start_date TEXT,
                        end_date TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `).run();

                await env.DB.prepare(`
                    INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(
                    subId, sub.userId || sub.user_id, sub.planId || sub.plan_id, sub.status || 'active', sub.startDate || sub.start_date, sub.endDate || sub.end_date
                ).run();
                await syncCollectionToR2(env, 'subscriptions', "SELECT * FROM subscriptions", res => res.map(s => ({ ...s, userId: s.user_id, planId: s.plan_id, startDate: s.start_date, endDate: s.end_date })));
                return Response.json({ success: true, id: subId }, { headers: corsHeaders });
            }

            if (method === "PUT" && path.startsWith("/api/subscriptions/")) {
                const subId = path.replace("/api/subscriptions/", "");
                const data = await request.json();
                await env.DB.prepare(`
                    UPDATE subscriptions SET 
                        status = COALESCE(?, status),
                        end_date = COALESCE(?, end_date)
                    WHERE id = ?
                `).bind(data.status, data.endDate || data.end_date, subId).run();
                await syncCollectionToR2(env, 'subscriptions', "SELECT * FROM subscriptions", res => res.map(s => ({ ...s, userId: s.user_id, planId: s.plan_id, startDate: s.start_date, endDate: s.end_date })));
                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // --- 4. SEMANTIC SEARCH (Vectorize) ---
            // Search: GET /api/search?q=chilled+reggae+vibe
            if (method === "GET" && path === "/api/search") {
                const query = url.searchParams.get("q");
                if (!query) return new Response("Missing query", { status: 400 });

                // Generate embedding for query
                const embeddingResponse = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [query] });
                const vector = embeddingResponse.data[0];

                // Search index
                const matches = await env.VECTOR_INDEX.query(vector, { topK: 5, returnMetadata: true });
                return new Response(JSON.stringify(matches), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // --- 5. ASSET STORAGE (R2) ---
            // Upload to R2: PUT /api/upload
            if (method === "PUT" && path.startsWith("/api/upload/")) {
                const key = path.replace("/api/upload/", "");
                const body = await request.arrayBuffer();
                const contentType = request.headers.get("content-type") || "application/octet-stream";

                await env.R2_BUCKET.put(key, body, {
                    httpMetadata: { contentType }
                });

                return new Response(JSON.stringify({
                    success: true,
                    url: `https://${env.PUBLIC_R2_DOMAIN}/${key}`
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Admin R2 Upload: POST /api/admin/r2-upload
            if (method === "POST" && path === "/api/admin/r2-upload") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) {
                    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
                }

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
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Admin R2 Sync: POST /api/admin/r2-sync
            if (method === "POST" && path === "/api/admin/r2-sync") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) {
                    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
                }

                const bodyBytes = await request.text();
                // Ensure we handle huge JSON bodies safely
                const body = JSON.parse(bodyBytes);

                const { collection, data, action, item, id, items, ids } = body;

                if (!collection) {
                    return new Response(JSON.stringify({ error: "Missing collection" }), { status: 400, headers: corsHeaders });
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

                    return new Response(JSON.stringify({ success: true, message: `Synced ${collection} via ${action}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                } else if (data) {
                    // Full replace
                    await env.R2_BUCKET.put(key, JSON.stringify(data), {
                        httpMetadata: { contentType: "application/json" }
                    });
                    return new Response(JSON.stringify({ success: true, message: `Replaced ${collection} to R2` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                return new Response(JSON.stringify({ error: "Must provide data or action" }), { status: 400, headers: corsHeaders });
            }

            // --- 6. ADMIN RESTORATION ---
            // Restore Products from R2 Images: POST /api/admin/restore-products
            if (method === "POST" && path === "/api/admin/restore-products") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) {
                    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
                }

                const listResponse = await env.R2_BUCKET.list({ prefix: "images/" });
                const objects = listResponse.objects;
                const publicDomain = env.PUBLIC_R2_DOMAIN || 'pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev';

                if (!objects.length) return new Response(JSON.stringify({ success: false, message: "No images found." }), { status: 200, headers: corsHeaders });

                // Group images by product ID or product Name
                const productsMap = {};
                for (const obj of objects) {
                    let keyPath = obj.key;
                    if (keyPath.startsWith("images/")) keyPath = keyPath.replace("images/", "");

                    const parts = keyPath.split("/");
                    if (parts.length === 0 || !parts[0]) continue;

                    let identifier;
                    if (parts.length > 1 && parts[0] === 'products') {
                        // Image is inside 'products' folder (e.g. products/p1771285147628_0.png)
                        const filename = parts.pop();
                        identifier = filename.split('_')[0]; // Extract p1771285147628
                    } else if (parts.length > 1) {
                        // Another folder name? Use folder name
                        identifier = decodeURIComponent(parts[0]);
                    } else {
                        // Root file
                        identifier = decodeURIComponent(parts[0].split(/[.\-]/)[0]);
                    }

                    const imageUrl = `https://${publicDomain}/${obj.key}`;

                    if (!productsMap[identifier]) productsMap[identifier] = [];
                    productsMap[identifier].push(imageUrl);
                }

                let restoredCount = 0;
                let updatedCount = 0;

                for (const [identifier, images] of Object.entries(productsMap)) {
                    // Check if the product exists by ID or by Name
                    const existing = await env.DB.prepare(
                        `SELECT id, image, images FROM products WHERE id = ? OR name = ? LIMIT 1`
                    ).bind(identifier, identifier).all();

                    if (existing.results.length === 0) {
                        // Product doesn't exist, create it
                        let newId = identifier;
                        if (!newId.startsWith('p')) {
                            newId = `rest_${identifier.replace(/\\W/g, '_').substring(0, 20)}_${Date.now()}`;
                        }
                        const mainImage = images[0];
                        await env.DB.prepare(
                            `INSERT INTO products (id, name, description, price, category, image, images, inventory, currency, created_at, updated_at) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
                        ).bind(
                            newId,
                            identifier,
                            "Restored description",
                            99.99,
                            "Recovered",
                            mainImage,
                            JSON.stringify(images),
                            10,
                            "KES"
                        ).run();
                        restoredCount++;
                    } else {
                        // Update existing product with missing images
                        const product = existing.results[0];
                        let existingImages = [];
                        try {
                            existingImages = JSON.parse(product.images || "[]");
                        } catch (e) { }

                        if (!Array.isArray(existingImages)) existingImages = product.image ? [product.image] : [];

                        let newImages = images.filter(img => !existingImages.includes(img));

                        if (newImages.length > 0 || !product.image) {
                            if (newImages.length > 0) existingImages.push(...newImages);
                            const updatedMainImage = existingImages[0] || product.image;
                            await env.DB.prepare(
                                `UPDATE products SET image = ?, images = ?, updated_at = datetime('now') WHERE id = ?`
                            ).bind(updatedMainImage, JSON.stringify(existingImages), product.id).run();
                            updatedCount++;
                        }
                    }
                }

                // Sync D1 to static R2 file so frontend sees it
                await syncProductsToR2(env);

                return new Response(JSON.stringify({ success: true, message: `Restoration complete. New: ${restoredCount}, Updated: ${updatedCount}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            return new Response("DJ Flowerz API: Operation not found", { status: 404, headers: corsHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }
};
