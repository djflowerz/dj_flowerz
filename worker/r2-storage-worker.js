
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
            return {
                ...p,
                images: Array.isArray(images) ? images : (p.image ? [p.image] : [])
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
                        id,
                        name,
                        description,
                        price,
                        category,
                        image,
                        images,
                        inventory,
                        currency,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `).bind(
                    productId,
                    product.name,
                    product.description,
                    product.price,
                    product.category,
                    product.image,
                    JSON.stringify(product.images || [product.image]),
                    product.inventory,
                    product.currency || 'KES'
                ).run();

                // Vectorize: Generate embedding for semantic search
                if (env.AI && env.VECTOR_INDEX) {
                    const textToEmbed = `${product.name}: ${product.description || ''}`;
                    const embeddingResponse = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [textToEmbed] });
                    const vector = embeddingResponse.data[0];
                    await env.VECTOR_INDEX.upsert([{ id: productId, values: vector, metadata: { name: product.name, type: 'product' } }]);
                }

                // Sync D1 to static R2 file so frontend sees it
                await syncProductsToR2(env);

                return Response.json({ success: true, id: productId }, { headers: corsHeaders });
            }

            // Update Product: PUT /api/products/:id
            if (method === "PUT" && path.startsWith("/api/products/")) {
                const productId = path.replace("/api/products/", "");
                const data = await request.json();
                const { name, description, price, category, image, images, inventory, is_active, is_featured, currency } = data;

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
                        updated_at = datetime('now')
                     WHERE id = ?`
                ).bind(
                    name, description, price, category, image,
                    images ? JSON.stringify(images) : null,
                    inventory,
                    is_active !== undefined ? (is_active ? 1 : 0) : null,
                    is_featured !== undefined ? (is_featured ? 1 : 0) : null,
                    currency,
                    productId
                ).run();

                // Sync D1 to static R2 file so frontend sees it
                await syncProductsToR2(env);

                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
