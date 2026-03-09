
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
                releaseDate: p.release_date,
                isActive: Boolean(p.is_active),
                isHot: Boolean(p.is_featured),
                stock: p.inventory, // Map inventory column to frontend 'stock' field
                meta_title: p.meta_title || p.name || "",
                meta_description: p.meta_description || (p.description ? p.description.substring(0, 160) : ""),
                meta_keywords: p.meta_keywords || `${p.name || ""}, ${p.category || ""}, DJ Flowerz`
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

// --- AdminHub Durable Object ---
export class AdminHub {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = [];
    }

    async fetch(request) {
        const url = new URL(request.url);

        // WebSocket logic
        if (request.headers.get("Upgrade") === "websocket") {
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            server.accept();
            this.sessions.push(server);

            server.addEventListener("close", () => {
                this.sessions = this.sessions.filter(s => s !== server);
            });

            return new Response(null, { status: 101, webSocket: client });
        }

        // Broadcast logic (for webhook/admin)
        if (url.pathname === "/broadcast") {
            const data = await request.json();
            this.broadcast(data);
            return new Response("OK");
        }

        if (url.pathname === "/reset") {
            // Placeholder for state reset
            console.log("[AdminHub] System Reset requested.");
            return new Response("Reset OK");
        }

        return new Response("Not Found", { status: 404 });
    }

    broadcast(data) {
        const msg = JSON.stringify(data);
        this.sessions.forEach(s => {
            try { s.send(msg); } catch (e) { }
        });
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

// --- Constants & Config ---
const DOWNLOAD_LIMITS = {
    'none': 0,
    'trial': 10,
    'weekly': 10,
    'monthly': 30,
    'pro': 200
};

// --- Helpers ---

async function sendEmail(env, { to, subject, html, from = "DJ Flowerz <no-reply@djflowerz.co.ke>" }) {
    if (!env.RESEND_API_KEY) {
        console.warn("[Email] RESEND_API_KEY not set. Skipping email to:", to);
        return false;
    }
    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ from, to, subject, html })
        });
        if (!res.ok) {
            const err = await res.text();
            console.error("[Email] Resend API error:", err);
            return false;
        }
        return true;
    } catch (e) {
        console.error("[Email] Failed to send email:", e);
        return false;
    }
}

async function verifySupabaseJWT(token, secret) {
    if (!token || !secret) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            base64UrlToUint8Array(signature),
            encoder.encode(`${header}.${payload}`)
        );

        if (!isValid) return null;
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
        console.error("[Auth] JWT Verification failed:", e);
        return null;
    }
}

function base64UrlToUint8Array(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const bin = atob(pad ? base64 + '='.repeat(4 - pad) : base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

async function getAuthorizedUser(request, env) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];

    const payload = await verifySupabaseJWT(token, env.SUPABASE_JWT_SECRET);
    if (!payload || !payload.email) return null;

    // Fetch full user record from D1
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(payload.email).first();
    return user;
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
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-folder, x-file-name, Range",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
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
            // Proxies track media (mp3, mp4, etc.) from the correct origin R2/worker CDN
            // via the djflowerz worker so all media uses one unified domain.
            // Supports ?origin= param to select the upstream CDN:
            //   - default: r2.vicknickvideopool.com
            //   - remix: remix-and-mashups-worker.dennismacharia20.workers.dev
            if (method === "GET" && path.startsWith("/files/")) {
                const filePath = decodeURIComponent(path.replace("/files/", ""));
                const originParam = url.searchParams.get("origin");

                let originBase;
                if (originParam === "remix") {
                    originBase = "https://remix-and-mashups-worker.dennismacharia20.workers.dev";
                } else {
                    originBase = "https://r2.vicknickvideopool.com";
                }

                // Re-encode just the path (not query) for the upstream request
                const encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
                const originUrl = `${originBase}/${encodedPath}`;
                const rangeHeader = request.headers.get("Range");

                const originRes = await fetch(originUrl, {
                    headers: {
                        "User-Agent": "DJFlowerz-Worker/1.0",
                        "Referer": "https://djflowerz.co.ke",
                        ...(rangeHeader ? { "Range": rangeHeader } : {})
                    }
                });

                const headers = new Headers(corsHeaders);
                headers.set("Content-Type", originRes.headers.get("Content-Type") || "application/octet-stream");
                headers.set("Cache-Control", "public, max-age=86400"); // 1 day cache
                headers.set("Accept-Ranges", "bytes");

                // Pass through critical headers for seeking/streaming
                const contentLength = originRes.headers.get("Content-Length");
                const contentRange = originRes.headers.get("Content-Range");
                if (contentLength) headers.set("Content-Length", contentLength);
                if (contentRange) headers.set("Content-Range", contentRange);

                return new Response(originRes.body, {
                    status: originRes.status,
                    headers
                });
            }

            // --- PAYSTACK WEBHOOK: POST /api/webhooks/paystack ---
            if (method === "POST" && path === "/api/webhooks/paystack") {
                const body = await request.json();

                if (body.event === "charge.success") {
                    const { user_id, plan_type } = body.data.metadata || {};
                    const email = body.data.customer?.email;

                    if (!email && !user_id) {
                        return new Response("Missing user info", { status: 400, headers: corsHeaders });
                    }

                    const planDays = { 'weekly': 7, 'monthly': 30, 'pro': 365 };
                    const days = planDays[plan_type] || 30;

                    await env.DB.prepare(`
                        UPDATE users SET 
                            is_subscriber = 1,
                            subscription_plan = ?,
                            subscription_end_date = datetime('now', '+' || ? || ' days'),
                            last_payment_ref = ?
                        WHERE id = ? OR email = ?
                    `).bind(plan_type || 'monthly', days, body.data.reference, user_id || null, email || null).run();

                    // Optional: Notify Admin Hub
                    try {
                        const hubId = env.ADMIN_HUB.idFromName("global_admin");
                        const hub = env.ADMIN_HUB.get(hubId);
                        await hub.fetch("https://hub/event", {
                            method: "POST",
                            body: JSON.stringify({
                                type: "PAYMENT_SUCCESS",
                                message: `Activated: ${email || user_id} for ${plan_type} plan.`
                            })
                        });
                    } catch (e) { }

                    return new Response("OK", { status: 200, headers: corsHeaders });
                }
                return new Response("Event ignored", { status: 200, headers: corsHeaders });
            }

            // --- ADMIN: MANAGE SUBSCRIPTIONS: POST /api/admin/subscriptions/manage ---
            if (method === "POST" && path === "/api/admin/subscriptions/manage") {
                const { userId, plan, action } = await request.json();

                if (action === 'revoke') {
                    await env.DB.prepare("UPDATE users SET is_subscriber = 0, subscription_end_date = NULL WHERE id = ?")
                        .bind(userId).run();
                } else {
                    const planDays = {
                        'trial': 7,
                        'weekly': 7,
                        'monthly': 30,
                        'pro': 365
                    };
                    const days = planDays[plan] || 30;

                    await env.DB.prepare(`
                        UPDATE users SET 
                            is_subscriber = 1, 
                            subscription_plan = ?, 
                            subscription_end_date = datetime('now', '+' || ? || ' days')
                        WHERE id = ?
                    `).bind(plan, days, userId).run();
                }

                return Response.json({ success: true }, { headers: corsHeaders });
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
                const productId = product.id || `p${Date.now()}`;

                // Extract and normalize fields
                const name = product.name;
                const description = product.description;
                const price = product.price;
                const category = product.category;
                const image = product.image;
                const images = product.images;
                const inventory = product.stock !== undefined ? product.stock : product.inventory;
                const is_active = product.isActive !== undefined ? product.isActive : product.is_active;
                const is_featured = product.isHot !== undefined ? product.isHot : (product.isFeatured !== undefined ? product.isFeatured : product.is_featured);
                const currency = product.currency || 'KES';
                const discount_price = product.discountPrice !== undefined ? product.discountPrice : product.discount_price;
                const compare_at_price = product.compareAtPrice !== undefined ? product.compareAtPrice : product.compare_at_price;
                const type = product.type || 'physical';
                const brand = product.brand;
                const release_date = product.releaseDate !== undefined ? product.releaseDate : product.release_date;
                const status = product.status || 'draft';
                const requires_shipping = product.requiresShipping !== undefined ? product.requiresShipping : product.requires_shipping;
                const weight = product.weight;
                const dimensions = product.dimensions;
                const sku = product.sku;
                const variant_groups = product.variantGroups !== undefined ? product.variantGroups : product.variant_groups;
                const whatsapp_enabled = product.whatsappEnabled !== undefined ? product.whatsappEnabled : product.whatsapp_enabled;
                const is_free = product.isFree !== undefined ? product.isFree : product.is_free;
                const meta_title = product.metaTitle || product.meta_title;
                const meta_description = product.metaDescription || product.meta_description;
                const meta_keywords = product.metaKeywords || product.meta_keywords;

                await env.DB.prepare(`
                    INSERT INTO products (
                        id, name, description, price, category, image, images, inventory, currency, 
                        is_active, is_featured, discount_price, compare_at_price, type, brand, release_date, status, 
                        requires_shipping, weight, dimensions, sku, variant_groups, 
                        whatsapp_enabled, is_free, meta_title, meta_description, meta_keywords, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `).bind(
                    productId,
                    name ?? null,
                    description ?? null,
                    price ?? null,
                    category ?? null,
                    image ?? null,
                    images ? JSON.stringify(images) : JSON.stringify([image ?? null]),
                    inventory ?? null,
                    currency,
                    is_active !== undefined ? (is_active ? 1 : 0) : 1,
                    is_featured ? 1 : 0,
                    discount_price ?? null,
                    compare_at_price ?? null,
                    type,
                    brand ?? null,
                    release_date ?? null,
                    status,
                    requires_shipping ? 1 : 0,
                    weight ?? null,
                    dimensions ?? null,
                    sku ?? null,
                    variant_groups ? JSON.stringify(variant_groups) : '[]',
                    whatsapp_enabled !== false ? 1 : 0,
                    is_free ? 1 : 0,
                    meta_title ?? null,
                    meta_description ?? null,
                    meta_keywords ?? null
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
                const productId = path.split("/").pop();
                const data = await request.json();

                // Extract and normalize fields (handle both camelCase from frontend and snake_case)
                const name = data.name;
                const description = data.description;
                const price = data.price;
                const category = data.category;
                const image = data.image;
                const images = data.images;
                const inventory = data.stock !== undefined ? data.stock : data.inventory;
                const is_active = data.isActive !== undefined ? data.isActive : data.is_active;
                const is_featured = data.isHot !== undefined ? data.isHot : (data.isFeatured !== undefined ? data.isFeatured : data.is_featured);
                const currency = data.currency;
                const discount_price = data.discountPrice !== undefined ? data.discountPrice : data.discount_price;
                const compare_at_price = data.compareAtPrice !== undefined ? data.compareAtPrice : data.compare_at_price;
                const type = data.type;
                const brand = data.brand;
                const release_date = data.releaseDate !== undefined ? data.releaseDate : data.release_date;
                const status = data.status;
                const requires_shipping = data.requiresShipping !== undefined ? data.requiresShipping : data.requires_shipping;
                const weight = data.weight;
                const dimensions = data.dimensions;
                const sku = data.sku;
                const variant_groups = data.variantGroups !== undefined ? data.variantGroups : data.variant_groups;
                const whatsapp_enabled = data.whatsappEnabled !== undefined ? data.whatsappEnabled : data.whatsapp_enabled;
                const is_free = data.isFree !== undefined ? data.isFree : data.is_free;

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
                        meta_title = COALESCE(?, meta_title),
                        meta_description = COALESCE(?, meta_description),
                        meta_keywords = COALESCE(?, meta_keywords),
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
                    discount_price,
                    compare_at_price,
                    type,
                    brand,
                    release_date,
                    status,
                    requires_shipping !== undefined ? (requires_shipping ? 1 : 0) : null,
                    weight,
                    dimensions,
                    sku,
                    variant_groups ? JSON.stringify(variant_groups) : null,
                    whatsapp_enabled !== undefined ? (whatsapp_enabled ? 1 : 0) : null,
                    is_free !== undefined ? (is_free ? 1 : 0) : null,
                    data.metaTitle ?? data.meta_title ?? null,
                    data.metaDescription ?? data.meta_description ?? null,
                    data.metaKeywords ?? data.meta_keywords ?? null,
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

            // ═══════════════════════════════════════════════════════════════════
            // SYSTEM HEALTH — GET /api/health
            // Checks D1 and R2 availability
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/health") {
                try {
                    // Check D1
                    await env.DB.prepare("SELECT 1").first();
                    // Check R2 (list a small subset)
                    await env.R2_BUCKET.list({ limit: 1 });

                    return Response.json({ status: "healthy", d1: "ok", r2: "ok" }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ status: "unhealthy", error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // --- GIG MANAGER: BLACKOUT DATES ---

            // Public: List Blackouts (for booking calendar)
            if (method === "GET" && path === "/api/blackouts") {
                const { results } = await env.DB.prepare("SELECT * FROM blackouts ORDER BY date ASC").all();
                return Response.json(results, { headers: corsHeaders });
            }

            // Admin: Add Blackout
            if (method === "POST" && path === "/api/admin/bookings/blackout") {
                const user = await getAuthorizedUser(request, env);
                if (!user || user.role !== 'admin') {
                    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
                }

                const { date, reason } = await request.json();
                const id = crypto.randomUUID();

                await env.DB.prepare("INSERT INTO blackouts (id, date, reason) VALUES (?, ?, ?)")
                    .bind(id, date, reason || "Gig Confirmed")
                    .run();

                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            // Admin: Delete Blackout
            if (method === "DELETE" && path.startsWith("/api/admin/bookings/blackout/")) {
                const user = await getAuthorizedUser(request, env);
                if (!user || user.role !== 'admin') {
                    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
                }

                const id = path.split("/").pop();
                await env.DB.prepare("DELETE FROM blackouts WHERE id = ?").bind(id).run();

                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // ADMIN EMERGENCY — POST /api/admin/system-reset
            // Flushes KV cache and clears Durable Object state
            // ═══════════════════════════════════════════════════════════════════
            if (method === "POST" && path === "/api/admin/system-reset") {
                // Auth check: Basic placeholder (In production, use a strong admin secret)
                const auth = request.headers.get("Authorization");
                if (auth !== `Bearer ${env.PAYSTACK_SECRET_KEY}`) return new Response("Forbidden", { status: 403 });

                try {
                    // 1. Clear Durable Object state by sending reset command
                    const hubId = env.ADMIN_HUB.idFromName("global_admin");
                    const hub = env.ADMIN_HUB.get(hubId);
                    await hub.fetch("http://hub/reset", { method: "POST" });

                    // 2. Note: Worker KV doesn't have a "deleteAll" via binding easily, 
                    // usually you'd iterate but that's expensive. In real life, 
                    // we might just broadcast the reset to other DOs.

                    return Response.json({ success: true, details: "AdminHub DO state cleared" }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // ADMIN MANUAL GRANT — POST /api/admin/manual-grant
            // Grant subscription or session status manually for cash payments
            // ═══════════════════════════════════════════════════════════════════
            if (method === "POST" && path === "/api/admin/manual-grant") {
                const auth = request.headers.get("Authorization");
                if (auth !== `Bearer ${env.PAYSTACK_SECRET_KEY}`) return new Response("Forbidden", { status: 403 });

                const { type, email, amount, id } = await request.json(); // type: 'subscription' or 'studio'

                if (type === 'subscription') {
                    const days = amount >= 3000 ? 30 : 1;
                    await env.DB.prepare(`
                        UPDATE users 
                        SET is_subscriber = 1, 
                        subscription_end_date = datetime('now', '+${days} days')
                        WHERE email = ?
                    `).bind(email).run();
                } else if (type === 'studio') {
                    await env.DB.prepare("UPDATE studio_sessions SET status = 'paid' WHERE id = ?").bind(id).run();
                }

                await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                    .bind("MANUAL_GRANT", `Admin manually granted ${type} to ${email}`).run();

                return Response.json({ success: true }, { headers: corsHeaders });
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
                const formatted = results.map(o => ({
                    ...o,
                    userId: o.user_id,
                    totalAmount: o.total_amount,
                    customerName: o.customer_name,
                    customerEmail: o.customer_email,
                    customerPhone: o.customer_phone,
                    paymentStatus: o.payment_status,
                    paymentMethod: o.payment_method,
                    trackingNumber: o.tracking_number,
                    refundStatus: o.refund_status,
                    shippingProvider: o.shipping_provider,
                    shippingMethod: o.shipping_method,
                    shippingCost: o.shipping_cost,
                    items: o.items ? JSON.parse(o.items) : []
                }));
                return Response.json(formatted, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/orders") {
                const order = await request.json();
                const orderId = order.id || `order_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO orders (
                        id, user_id, total_amount, status, items, 
                        customer_name, customer_email, customer_phone, city, address,
                        payment_status, payment_method, tracking_number, 
                        shipping_provider, shipping_method, shipping_cost, notes, 
                        paystack_ref, refund_status, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `).bind(
                    orderId,
                    order.userId || order.user_id,
                    order.totalAmount || order.total_amount,
                    order.status || 'pending',
                    JSON.stringify(order.items || []),
                    order.customerName || order.customer_name,
                    order.customerEmail || order.customer_email,
                    order.customerPhone || order.customer_phone,
                    order.city,
                    order.address || order.shipping_address,
                    order.paymentStatus || order.payment_status || 'unpaid',
                    order.paymentMethod || order.payment_method,
                    order.trackingNumber || order.tracking_number,
                    order.shippingProvider || order.shipping_provider,
                    order.shippingMethod || order.shipping_method,
                    order.shippingCost || order.shipping_cost || 0,
                    order.notes || null,
                    order.paystackRef || order.paystack_ref || null,
                    order.refundStatus || order.refund_status || null
                ).run();
                await syncCollectionToR2(env, 'orders', "SELECT * FROM orders ORDER BY created_at DESC", res => res.map(o => ({
                    ...o,
                    userId: o.user_id,
                    totalAmount: o.total_amount,
                    customerName: o.customer_name,
                    customerEmail: o.customer_email,
                    customerPhone: o.customer_phone,
                    paymentStatus: o.payment_status,
                    paymentMethod: o.payment_method,
                    trackingNumber: o.tracking_number,
                    refundStatus: o.refund_status,
                    shippingProvider: o.shipping_provider,
                    shippingMethod: o.shipping_method,
                    shippingCost: o.shipping_cost,
                    items: o.items ? JSON.parse(o.items) : []
                })));
                return Response.json({ success: true, id: orderId }, { headers: corsHeaders });
            }

            if (method === "PUT" && path.startsWith("/api/orders/")) {
                const orderId = path.replace("/api/orders/", "");
                const data = await request.json();
                await env.DB.prepare(`
                    UPDATE orders SET 
                        status = COALESCE(?, status),
                        tracking_number = COALESCE(?, tracking_number),
                        refund_status = COALESCE(?, refund_status),
                        payment_status = COALESCE(?, payment_status)
                    WHERE id = ?
                `).bind(
                    data.status,
                    data.trackingNumber || data.tracking_number,
                    data.refundStatus || data.refund_status,
                    data.paymentStatus || data.payment_status,
                    orderId
                ).run();
                await syncCollectionToR2(env, 'orders', "SELECT * FROM orders ORDER BY created_at DESC", res => res.map(o => ({
                    ...o,
                    userId: o.user_id,
                    totalAmount: o.total_amount,
                    customerName: o.customer_name,
                    customerEmail: o.customer_email,
                    customerPhone: o.customer_phone,
                    paymentStatus: o.payment_status,
                    paymentMethod: o.payment_method,
                    trackingNumber: o.tracking_number,
                    refundStatus: o.refund_status,
                    shippingProvider: o.shipping_provider,
                    shippingMethod: o.shipping_method,
                    shippingCost: o.shipping_cost,
                    items: o.items ? JSON.parse(o.items) : []
                })));
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

            // --- PAYSTACK WEBHOOK ---
            if (method === "POST" && path === "/api/paystack/webhook") {
                const signature = request.headers.get("x-paystack-signature");
                if (!signature) return new Response("Forbidden", { status: 403 });

                const body = await request.json();
                console.log("[Paystack Webhook] Event:", body.event);

                if (body.event === "charge.success") {
                    const email = body.data.customer.email;
                    const amount = body.data.amount / 100;
                    const reference = body.data.reference;
                    const planCode = body.data.plan?.plan_code;

                    // Calculate expiry (default 30 days if no plan recognized)
                    let days = 30;
                    if (planCode?.includes('weekly')) days = 7;
                    if (planCode?.includes('3months')) days = 90;
                    if (planCode?.includes('6months')) days = 180;
                    if (planCode?.includes('yearly')) days = 365;

                    // Update D1
                    await env.DB.prepare(`
                        UPDATE profiles 
                        SET is_subscriber = 1, 
                            subscription_expiry = datetime('now', '+' || ? || ' days'),
                            updated_at = datetime('now')
                        WHERE email = ?
                    `).bind(days, email).run();

                    // Process Referral Rewards
                    const referral = await env.DB.prepare(`
                        SELECT * FROM referrals 
                        WHERE referred_id = (SELECT id FROM profiles WHERE email = ?) 
                        AND status = 'pending'
                        LIMIT 1
                    `).bind(email).first();

                    if (referral) {
                        // Reward Referrer (Fixed for now: 200 KES + 7 Days)
                        await env.DB.prepare(`
                            UPDATE profiles 
                            SET referral_balance_kes = referral_balance_kes + 200,
                                referral_earned_days = referral_earned_days + 7,
                                updated_at = datetime('now')
                            WHERE id = ?
                        `).bind(referral.referrer_id).run();

                        await env.DB.prepare(`
                            UPDATE referrals SET status = 'completed', reward_granted = 1 WHERE id = ?
                        `).bind(referral.id).run();
                    }

                    // Notify UI via Durable Object
                    const hubId = env.ADMIN_HUB.idFromName("global");
                    const hub = env.ADMIN_HUB.get(hubId);
                    await hub.fetch("http://hub/broadcast", {
                        method: "POST",
                        body: JSON.stringify({ type: "PAYMENT_SUCCESS", email, amount, reference, hasReferral: !!referral })
                    });
                }

                return new Response("OK", { status: 200, headers: corsHeaders });
            }

            // --- ADMIN: UPDATE SUBSCRIPTION (Time extension) ---
            if (method === "POST" && path === "/api/admin/update-subscription") {
                const { userId, days, action } = await request.json();

                if (action === 'revoke') {
                    await env.DB.prepare(`
                        UPDATE profiles 
                        SET is_subscriber = 0, subscription_expiry = null, updated_at = datetime('now')
                        WHERE id = ?
                    `).bind(userId).run();
                } else {
                    await env.DB.prepare(`
                        UPDATE profiles 
                        SET is_subscriber = 1, 
                            subscription_expiry = datetime(COALESCE(subscription_expiry, datetime('now')), '+' || ? || ' days'),
                            updated_at = datetime('now')
                        WHERE id = ?
                    `).bind(days || 30, userId).run();
                }

                // Notify UI
                const hubId = env.ADMIN_HUB.idFromName("global");
                const hub = env.ADMIN_HUB.get(hubId);
                await hub.fetch("http://hub/broadcast", {
                    method: "POST",
                    body: JSON.stringify({ type: "SUBSCRIPTION_UPDATED", userId, action })
                });

                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // --- REWARDS & COUPONS ---

            // 1. Validate Coupon: GET /api/coupons/validate?code=XYZ&scope=abc&amount=123
            if (method === "GET" && path === "/api/coupons/validate") {
                const code = url.searchParams.get("code");
                const scope = url.searchParams.get("scope") || 'all';
                const amount = parseFloat(url.searchParams.get("amount") || "0");
                const userId = url.searchParams.get("userId");

                if (!code) return Response.json({ valid: false, message: "Missing code" }, { headers: corsHeaders });

                const { results } = await env.DB.prepare(`
                    SELECT * FROM coupons 
                    WHERE code = ? AND is_active = 1 
                    AND (expiry_date IS NULL OR expiry_date > datetime('now'))
                    LIMIT 1
                `).bind(code).all();

                if (results.length === 0) {
                    return Response.json({ valid: false, message: "Invalid or expired coupon" }, { headers: corsHeaders });
                }

                const coupon = results[0];

                // Check scope
                if (coupon.scope !== 'all' && coupon.scope !== scope) {
                    return Response.json({ valid: false, message: `This coupon is only valid for ${coupon.scope}` }, { headers: corsHeaders });
                }

                // Check min spend
                if (amount < coupon.min_spend) {
                    return Response.json({ valid: false, message: `Minimum spend of KES ${coupon.min_spend} required` }, { headers: corsHeaders });
                }

                // Check usage limits
                if (coupon.max_uses_total !== null) {
                    const usageCount = await env.DB.prepare("SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_code = ?").bind(code).first("count");
                    if (usageCount >= coupon.max_uses_total) {
                        return Response.json({ valid: false, message: "Coupon usage limit reached" }, { headers: corsHeaders });
                    }
                }

                // Check one-time per user
                if (coupon.is_one_time_per_user && userId) {
                    const userUsage = await env.DB.prepare("SELECT id FROM coupon_usage WHERE coupon_code = ? AND user_id = ?").bind(code, userId).all();
                    if (userUsage.results.length > 0) {
                        return Response.json({ valid: false, message: "You have already used this coupon" }, { headers: corsHeaders });
                    }
                }

                return Response.json({
                    valid: true,
                    discountType: coupon.discount_type,
                    discountValue: coupon.discount_value,
                    message: "Coupon applied successfully!"
                }, { headers: corsHeaders });
            }

            // 2. Generate Referral Code: POST /api/referrals/generate
            if (method === "POST" && path === "/api/referrals/generate") {
                const { userId, email } = await request.json();
                if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

                // Generate a unique 6-character code
                const code = (email.substring(0, 3) + Math.random().toString(36).substring(2, 5)).toUpperCase();

                await env.DB.prepare("UPDATE profiles SET referral_code = ? WHERE id = ?").bind(code, userId).run();

                // Also create a "flexible" coupon for this referral code
                const couponId = `ref_${code}`;
                await env.DB.prepare(`
                    INSERT OR REPLACE INTO coupons (id, code, scope, discount_type, discount_value, created_by_ref_user_id)
                    VALUES (?, ?, 'all', 'percentage', 10, ?)
                `).bind(couponId, code, userId).run();

                return Response.json({ success: true, code }, { headers: corsHeaders });
            }

            // 3. Track Referral Landing: POST /api/referrals/track
            if (method === "POST" && path === "/api/referrals/track") {
                const { referrerCode, referredId, ip } = await request.json();

                // Find referrer
                const referrer = await env.DB.prepare("SELECT id FROM profiles WHERE referral_code = ?").bind(referrerCode).first();
                if (!referrer) return Response.json({ error: "Invalid referrer code" }, { status: 400, headers: corsHeaders });

                const refId = `ref_track_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO referrals (id, referrer_id, referred_id, status, ip_address)
                    VALUES (?, ?, ?, 'pending', ?)
                `).bind(refId, referrer.id, referredId, ip).run();

                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // 4. Get User Rewards: GET /api/user/rewards
            if (method === "GET" && path === "/api/user/rewards") {
                const userId = url.searchParams.get("userId");
                if (!userId) return Response.json({ error: "Missing userId" }, { status: 400, headers: corsHeaders });

                const profile = await env.DB.prepare("SELECT referral_code, referral_balance_kes, referral_earned_days FROM profiles WHERE id = ?").bind(userId).first();
                const { results: referrals } = await env.DB.prepare("SELECT * FROM referrals WHERE referrer_id = ?").bind(userId).all();

                return Response.json({
                    referralCode: profile?.referral_code,
                    balance: profile?.referral_balance_kes || 0,
                    earnedDays: profile?.referral_earned_days || 0,
                    referralCount: referrals.length,
                    history: referrals
                }, { headers: corsHeaders });
            }

            // 5. Get Store Settings: GET /api/store/settings
            if (method === "GET" && path === "/api/store/settings") {
                const { results } = await env.DB.prepare("SELECT * FROM store_settings").all();
                const settings = results.reduce((acc, row) => {
                    acc[row.key] = row.value;
                    return acc;
                }, {});
                return Response.json(settings, { headers: corsHeaders });
            }

            // --- REAL-TIME HUB CONNECTION ---
            if (path === "/api/realtime") {
                const hubId = env.ADMIN_HUB.idFromName("global");
                const hub = env.ADMIN_HUB.get(hubId);
                return hub.fetch(request);
            }

            // --- NEWSLETTER & MARKETING ---

            // 1. Public Subscribe: POST /api/newsletter/subscribe
            if (method === "POST" && path === "/api/newsletter/subscribe") {
                const { email, fullName, tags } = await request.json();
                if (!email) return Response.json({ error: "Email required" }, { status: 400, headers: corsHeaders });

                const id = `sub_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO subscribers (id, email, fullName, tags, is_active)
                    VALUES (?, ?, ?, ?, 1)
                    ON CONFLICT(email) DO UPDATE SET is_active = 1, updated_at = datetime('now')
                `).bind(id, email, fullName || null, JSON.stringify(tags || [])).run();

                // Notify Hub
                const hubId = env.ADMIN_HUB.idFromName("global");
                const hub = env.ADMIN_HUB.get(hubId);
                await hub.fetch("http://hub/broadcast", {
                    method: "POST",
                    body: JSON.stringify({ type: "NEW_SUBSCRIBER", email, fullName })
                });

                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // 2. Admin Subscribers: GET /api/admin/subscribers
            if (method === "GET" && path === "/api/admin/subscribers") {
                const { results } = await env.DB.prepare("SELECT * FROM subscribers ORDER BY created_at DESC").all();
                return Response.json(results, { headers: corsHeaders });
            }

            // 3. Admin Broadcast: POST /api/admin/broadcast
            if (method === "POST" && path === "/api/admin/broadcast") {
                const { subject, content, target } = await request.json();

                let query = "SELECT email FROM subscribers WHERE is_active = 1";
                if (target === 'active_djs') {
                    query = "SELECT email FROM profiles WHERE is_subscriber = 1";
                }

                const { results } = await env.DB.prepare(query).all();

                // Logging the campaign
                const campaignId = `camp_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO newsletter_campaigns (id, subject, content, target_audience, sent_count)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(campaignId, subject, content, target, results.length).run();

                // Send via Resend (Example Integration)
                if (env.RESEND_API_KEY) {
                    for (const user of results) {
                        try {
                            await fetch("https://api.resend.com/emails", {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    from: "DJ Flowerz <promo@djflowerz.co.ke>",
                                    to: user.email,
                                    subject: subject,
                                    html: content + "<br><br><small>To unsubscribe, <a href='https://djflowerz.co.ke/unsubscribe'>click here</a></small>"
                                })
                            });
                        } catch (e) {
                            console.error("[Broadcast] Resend failed for:", user.email, e);
                        }
                    }
                }

                // Log to Admin Logs
                await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                    .bind("NEWSLETTER_SENT", `Subject: ${subject} sent to ${results.length} users`).run();

                return Response.json({ success: true, count: results.length }, { headers: corsHeaders });
            }

            // --- SUPPORT & MESSAGES ---

            // 1. Submit Ticket: POST /api/contact/submit
            if (method === "POST" && path === "/api/contact/submit") {
                const body = await request.json();
                const id = `ticket_${Date.now()}`;

                await env.DB.prepare(`
                    INSERT INTO support_tickets (id, customer_name, customer_email, customer_phone, subject, message_content, source)
                    VALUES (?, ?, ?, ?, ?, ?, 'web')
                `).bind(id, body.name, body.email, body.phone || null, body.subject || 'Web Inquiry', body.message).run();

                // Notify Hub
                const hubId = env.ADMIN_HUB.idFromName("global");
                const hub = env.ADMIN_HUB.get(hubId);
                await hub.fetch("http://hub/broadcast", {
                    method: "POST",
                    body: JSON.stringify({ type: "NEW_MESSAGE", customer: body.name, subject: body.subject })
                });

                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            // 2. Admin Tickets: GET /api/admin/tickets
            if (method === "GET" && path === "/api/admin/tickets") {
                const { results } = await env.DB.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all();
                return Response.json(results, { headers: corsHeaders });
            }

            // 3. Admin Ticket Update: PUT /api/admin/tickets/:id
            if (method === "PUT" && path.startsWith("/api/admin/tickets/")) {
                const id = path.split("/").pop();
                const { status, admin_notes } = await request.json();

                await env.DB.prepare(`
                    UPDATE support_tickets 
                    SET status = COALESCE(?, status), 
                        admin_notes = COALESCE(?, admin_notes),
                        updated_at = datetime('now')
                    WHERE id = ?
                `).bind(status || null, admin_notes || null, id).run();

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

            // --- 7. STUDIO & EVENTS HUB ---

            // Studio Booking: POST /api/bookings/studio
            if (method === "POST" && path === "/api/bookings/studio") {
                const booking = await request.json();
                const bookingId = `studio_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO studio_sessions (
                        id, dj_id, customer_email, session_date, start_time, 
                        duration_hours, extras, total_price_kes, status, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
                `).bind(
                    bookingId,
                    booking.dj_id || null,
                    booking.email,
                    booking.date,
                    booking.startTime,
                    booking.duration || 1,
                    JSON.stringify(booking.extras || []),
                    booking.totalPrice
                ).run();

                return new Response(JSON.stringify({ success: true, id: bookingId }), { headers: corsHeaders });
            }

            // Event Inquiry: POST /api/bookings/gig
            if (method === "POST" && path === "/api/bookings/gig") {
                const inquiry = await request.json();
                const inquiryId = `gig_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO event_gigs (
                        id, client_id, client_name, client_email, event_date, 
                        event_type, location_details, guests_estimate, requirements, status, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inquiry', datetime('now'))
                `).bind(
                    inquiryId,
                    inquiry.client_id || null,
                    inquiry.name,
                    inquiry.email,
                    inquiry.date,
                    inquiry.type,
                    inquiry.location,
                    inquiry.guests || 0,
                    inquiry.requirements || ""
                ).run();

                // Notify Admin Panel
                try {
                    const hubId = env.ADMIN_HUB.idFromName("global_admin");
                    const hub = env.ADMIN_HUB.get(hubId);
                    await hub.fetch("http://hub/broadcast", {
                        method: "POST",
                        body: JSON.stringify({
                            type: "GIG_INQUIRY",
                            message: `New Inquiry: ${inquiry.type} on ${inquiry.date}`
                        })
                    });
                } catch (_) { }

                return new Response(JSON.stringify({ success: true, id: inquiryId }), { headers: corsHeaders });
            }

            // --- 8. MUSIC POOL PRO (SERVICE PACKS) ---

            // GET /api/pool/tracks — High-performance Service Pack fetch
            if (method === "GET" && path === "/api/pool/tracks") {
                const user = await getAuthorizedUser(request, env);

                // 1. GATEKEEPER CHECK
                const isMaster = user?.email === 'ianmuriithiflowerz@gmail.com';
                const now = new Date().getTime();
                const expiry = user?.subscription_end_date ? new Date(user.subscription_end_date).getTime() : 0;
                const isSubscribed = (user?.is_subscriber === 1 && expiry > now);

                if (!isMaster && !isSubscribed) {
                    return new Response(JSON.stringify({
                        error: "ACCESS_DENIED",
                        message: "Members Only. Please subscribe to access the Music Pool.",
                        status: "locked"
                    }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                const genre = url.searchParams.get("genre");
                const search = url.searchParams.get("search");

                let query = `
                    SELECT 
                        t.*,
                        json_group_array(
                            json_object(
                                'id', v.id,
                                'version_name', v.version_name,
                                'preview_url', v.preview_url,
                                'download_url', v.download_url,
                                'is_video', v.is_video
                            )
                        ) as versions
                    FROM tracks t
                    JOIN track_versions v ON t.id = v.track_id
                    WHERE t.is_active = 1
                `;

                const params = [];
                if (genre) {
                    query += " AND t.display_genre = ?";
                    params.push(genre);
                }

                if (search) {
                    query += " AND (t.title LIKE ? OR t.artist LIKE ?)";
                    params.push(`%${search}%`, `%${search}%`);
                }

                query += " GROUP BY t.id ORDER BY t.created_at DESC LIMIT 500";

                const { results } = await env.DB.prepare(query).bind(...params).all();

                // Parse the JSON strings from D1
                const formatted = results.map(r => ({
                    ...r,
                    versions: JSON.parse(r.versions),
                    // Add usage context for the user
                    user_usage: {
                        daily_limit: DOWNLOAD_LIMITS[user.current_plan || 'none'],
                        daily_count: user.daily_download_count || 0
                    }
                }));

                return Response.json(formatted, { headers: corsHeaders });
            }

            // GET /api/pool/download — Secured download with limit enforcement
            if (method === "GET" && path === "/api/pool/download") {
                const user = await getAuthorizedUser(request, env);
                if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const versionId = url.searchParams.get("versionId");
                if (!versionId) return new Response("Missing versionId", { status: 400, headers: corsHeaders });

                // 1. MASTER ADMIN BYPASS
                const isMaster = user.email === 'ianmuriithiflowerz@gmail.com';

                if (!isMaster) {
                    // 2. SUBSCRIPTION CHECK
                    const now = new Date().getTime();
                    const expiry = user.subscription_end_date ? new Date(user.subscription_end_date).getTime() : 0;
                    if (user.is_subscriber !== 1 || expiry <= now) {
                        return Response.json({ error: "SUBSCRIPTION_EXPIRED" }, { status: 403, headers: corsHeaders });
                    }

                    // 3. LIMIT CHECK & RESET
                    const lastReset = user.last_download_reset ? new Date(user.last_download_reset).getTime() : 0;
                    const oneDay = 24 * 60 * 60 * 1000;
                    let currentCount = user.daily_download_count || 0;

                    if (Date.now() - lastReset > oneDay) {
                        // Reset count
                        await env.DB.prepare("UPDATE users SET daily_download_count = 0, last_download_reset = CURRENT_TIMESTAMP WHERE id = ?").bind(user.id).run();
                        currentCount = 0;
                    }

                    const planLimit = DOWNLOAD_LIMITS[user.current_plan || 'none'];
                    if (currentCount >= planLimit) {
                        return Response.json({
                            error: "LIMIT_REACHED",
                            message: `Daily limit of ${planLimit} tracks reached. Resets in 24h.`
                        }, { status: 429, headers: corsHeaders });
                    }

                    // 4. INCREMENT COUNT
                    await env.DB.prepare("UPDATE users SET daily_download_count = daily_download_count + 1 WHERE id = ?").bind(user.id).run();
                }

                // 5. GET DOWNLOAD URL
                const version = await env.DB.prepare("SELECT download_url FROM track_versions WHERE id = ?").bind(versionId).first();
                if (!version || !version.download_url) return new Response("File not found", { status: 404, headers: corsHeaders });

                // Success: Redirect to actual R2 link or proxy it
                // To keep it clean and hide R2 URL, we could proxy, but redirect is faster if R2 is public/presigned
                return Response.redirect(version.download_url, 302);
            }

            // POST /api/admin/migrate-pool-json — Internal ingestion tool
            if (method === "POST" && path === "/api/admin/migrate-pool-json") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const body = await request.json();
                console.log("[Migration] Received body:", JSON.stringify(body).substring(0, 200));

                // --- NEW: Dynamic Filters Route ---
                if (method === "GET" && path === "/api/musicpool/filters") {
                    const genres = await env.DB.prepare("SELECT DISTINCT display_genre FROM tracks WHERE is_active = 1 AND display_genre IS NOT NULL ORDER BY display_genre").all();
                    const years = await env.DB.prepare("SELECT DISTINCT release_year FROM tracks WHERE is_active = 1 AND release_year IS NOT NULL ORDER BY release_year DESC").all();
                    const months = await env.DB.prepare("SELECT DISTINCT release_month FROM tracks WHERE is_active = 1 AND release_month IS NOT NULL ORDER BY release_month").all();

                    return Response.json({
                        genres: genres.results.map(r => r.display_genre),
                        years: years.results.map(r => String(r.release_year)),
                        months: months.results.map(r => r.release_month)
                    }, { headers: corsHeaders });
                }
                const batch = body.tracks || [];
                console.log(`[Migration] Batch size: ${batch.length}`);
                let inserted = 0;
                const errors = [];
                for (const t of batch) {
                    try {
                        // Create parent track
                        await env.DB.prepare(`
                            INSERT INTO tracks (id, title, artist, display_genre, collection_hub, created_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO NOTHING
                        `).bind(t.id, t.title, t.artist, t.display_genre || t.genre, t.year, t.dateAdded || new Date().toISOString()).run();

                        // Add versions
                        for (const v of (t.versions || [])) {
                            const downloadUrl = v.downloadUrl;
                            if (!downloadUrl) continue;
                            const isVideo = downloadUrl.toLowerCase().endsWith('.mp4') || downloadUrl.toLowerCase().endsWith('.mov');
                            const versionId = `${t.id}-${v.type || 'Original'}-${Date.now()}`;
                            await env.DB.prepare(`
                                INSERT INTO track_versions (id, track_id, version_name, preview_url, download_url, is_video)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `).bind(versionId, t.id, v.type || "Original", t.previewUrl, downloadUrl, isVideo ? 1 : 0).run();
                        }
                        inserted++;
                    } catch (e) {
                        errors.push({ id: t.id, error: e.message });
                    }
                }

                return Response.json({ success: true, inserted, errorCount: errors.length, firstErrors: errors.slice(0, 5) }, { headers: corsHeaders });
            }

            // Health Check: GET /api/health
            if (method === "GET" && path === "/api/health") {
                try {
                    // Test D1
                    await env.DB.prepare("SELECT 1").run();
                    // Test R2
                    await env.R2_BUCKET.list({ limit: 1 });

                    return new Response(JSON.stringify({
                        status: "online",
                        timestamp: new Date().toISOString(),
                        components: { d1: "connected", r2: "connected", do: "active" }
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (e) {
                    return new Response(JSON.stringify({
                        status: "degraded",
                        error: e.message
                    }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // Mixtape Tracking: POST /api/mixtape/track
            if (method === "POST" && path === "/api/mixtape/track") {
                const { mixtapeId, action } = await request.json(); // 'play' or 'download'
                const column = action === 'play' ? 'play_count' : 'download_count';

                await env.DB.prepare(`
                    UPDATE mixtapes SET ${column} = ${column} + 1 WHERE id = ?
                `).bind(mixtapeId).run();

                // Bonus: Broadcast "Hype" to Admin
                if (action === 'play') {
                    try {
                        const hubId = env.ADMIN_HUB.idFromName("global_admin");
                        const hub = env.ADMIN_HUB.get(hubId);
                        await hub.fetch("http://hub/broadcast", {
                            method: "POST",
                            body: JSON.stringify({
                                type: "MIXTAPE_HYPE",
                                message: `Mix playing: ${mixtapeId}`
                            })
                        });
                    } catch (_) { }
                }

                return new Response("OK", { headers: corsHeaders });
            }

            // Admin: GET /api/admin/studio-sessions
            if (method === "GET" && path === "/api/admin/studio-sessions") {
                const { results } = await env.DB.prepare("SELECT * FROM studio_sessions ORDER BY session_date DESC, start_time DESC").all();
                return Response.json(results, { headers: corsHeaders });
            }

            // Admin: GET /api/admin/event-gigs
            if (method === "GET" && path === "/api/admin/event-gigs") {
                const { results } = await env.DB.prepare("SELECT * FROM event_gigs ORDER BY event_date DESC").all();
                return Response.json(results, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // PAYSTACK WEBHOOK — POST /webhooks/paystack
            // Verifies HMAC-SHA512 signature, logs payment, grants subscription,
            // and broadcasts real-time alert to Admin via Durable Object.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "POST" && path === "/webhooks/paystack") {
                const sig = request.headers.get("x-paystack-signature");
                if (!sig) return new Response("No Signature", { status: 401 });

                const rawBody = await request.text();

                // Verify HMAC SHA-512 using Web Crypto (no NPM needed on the Edge)
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey(
                    "raw",
                    encoder.encode(env.PAYSTACK_SECRET_KEY || ""),
                    { name: "HMAC", hash: "SHA-512" },
                    false,
                    ["sign"]
                );
                const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
                const computedHash = Array.from(new Uint8Array(sigBuffer))
                    .map(b => b.toString(16).padStart(2, "0"))
                    .join("");

                if (computedHash !== sig) {
                    console.error("[Webhook] Paystack signature mismatch — rejected.");
                    return new Response("Invalid Signature", { status: 401 });
                }

                const body = JSON.parse(rawBody);

                if (body.event === "charge.success") {
                    const data = body.data;
                    const ref = data.reference;
                    const email = data.customer?.email || "";
                    const amountKes = (data.amount || 0) / 100;
                    const channel = data.channel || "unknown";
                    const currency = data.currency || "KES";

                    // 1. Log payment (idempotent — ignore duplicate refs)
                    await env.DB.prepare(`
                        INSERT INTO payments (id, customer_email, amount_kes, channel, currency, verified_sig, metadata, created_at)
                        VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'))
                        ON CONFLICT(id) DO NOTHING
                    `).bind(ref, email, amountKes, channel, currency, JSON.stringify(data)).run();

                    // 2. Route fulfillment based on metadata type
                    const meta = data.metadata || {};
                    let fulfillmentMsg = "";
                    let d1UpdateOk = false;

                    try {
                        if (meta.type === "subscription") {
                            let days = 30;
                            let plan = 'monthly';

                            if (amountKes >= 5000) { plan = 'pro'; days = 365; }
                            else if (amountKes >= 1000) { plan = 'monthly'; days = 30; }
                            else if (amountKes >= 300) { plan = 'weekly'; days = 7; }
                            else if (amountKes >= 50) {
                                // Trial check
                                const user = await env.DB.prepare("SELECT has_used_trial FROM users WHERE email = ?").bind(email).first();
                                if (user?.has_used_trial) {
                                    fulfillmentMsg = "TRIAL_ALREADY_USED";
                                    throw new Error("One-time trial already used.");
                                }
                                plan = 'trial'; days = 7;
                            }

                            const expiry = new Date();
                            expiry.setDate(expiry.getDate() + days);

                            await env.DB.prepare(`
                                UPDATE users SET 
                                    is_subscriber = 1, 
                                    subscription_end_date = ?, 
                                    current_plan = ?,
                                    has_used_trial = CASE WHEN ? = 'trial' THEN 1 ELSE has_used_trial END
                                WHERE email = ?
                            `).bind(expiry.toISOString(), plan, plan, email).run();

                            fulfillmentMsg = `Subscription Granted (${plan})`;

                            // Send Receipt
                            await sendEmail(env, {
                                to: email,
                                subject: "Your DJ Flowerz Subscription is Active!",
                                html: `<h1>Welcome to the VIP Pool!</h1><p>Your ${plan} subscription is now active until ${expiry.toLocaleDateString()}.</p><p>Enjoy unlimited downloads and exclusive content.</p>`
                            });
                        }
                        else if (meta.type === "studio_session") {
                            await env.DB.prepare(`
                                UPDATE studio_sessions SET status = 'paid', paystack_ref = ? WHERE id = ?
                            `).bind(ref, meta.bookingId).run();
                            fulfillmentMsg = "Studio Session Locked";

                            // Send Receipt
                            await sendEmail(env, {
                                to: email,
                                subject: "Studio Session Confirmed - DJ Flowerz",
                                html: `<h1>We're Ready for You!</h1><p>Your studio session (Ref: ${meta.bookingId}) has been confirmed and paid.</p><p>Check your dashboard for details.</p>`
                            });
                        }
                        else if (meta.type === "event_gig") {
                            await env.DB.prepare(`
                                UPDATE event_gigs SET status = 'confirmed', deposit_received = ?, paystack_ref = ? WHERE id = ?
                            `).bind(amountKes, ref, meta.gigId).run();
                            fulfillmentMsg = "Event Gig Confirmed";

                            // Send Receipt
                            await sendEmail(env, {
                                to: email,
                                subject: "Gig Deposit Received - DJ Flowerz",
                                html: `<h1>It's a Date!</h1><p>We've received your deposit of KES ${amountKes} for the event on ${meta.eventDate || 'your selected date'}.</p><p>Ref: ${meta.gigId}</p>`
                            });
                        }
                        else if (meta.type === "store_order") {
                            await env.DB.prepare(`
                                UPDATE orders SET status = 'paid', payment_status = 'paid', paystack_ref = ? WHERE id = ?
                            `).bind(ref, meta.orderId).run();
                            fulfillmentMsg = "Store Order Paid";

                            // Fetch order details for rich receipt
                            const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(meta.orderId).first();
                            if (order) {
                                const items = JSON.parse(order.items || "[]");
                                const itemsHtml = items.map(it => `<li>${it.name} x ${it.qty || it.quantity} - KES ${it.price * (it.qty || it.quantity)}</li>`).join('');
                                await sendEmail(env, {
                                    to: email,
                                    subject: `Order Confirmation #${order.id}`,
                                    html: `
                                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                                            <h2 style="color: #e11d48;">Thanks for your order!</h2>
                                            <p>Hi ${order.customer_name || 'there'},</p>
                                            <p>Your payment of <strong>KES ${order.total_amount}</strong> was successful. Here's what you ordered:</p>
                                            <ul style="list-style: none; padding: 0;">${itemsHtml}</ul>
                                            <hr/>
                                            <p><strong>Shipping to:</strong><br/>${order.address}, ${order.city}</p>
                                            <p>We'll send you a tracking number as soon as your items are dispatched.</p>
                                            <p>Questions? Just reply to this email.</p>
                                        </div>
                                    `
                                });
                            }
                        }
                        else {
                            // Fallback: Default to subscription if no type (backward compatibility)
                            const expiry = new Date();
                            expiry.setDate(expiry.getDate() + 30);
                            await env.DB.prepare(`
                                UPDATE users SET is_subscriber = 1, subscription_end_date = ? WHERE email = ?
                            `).bind(expiry.toISOString(), email).run();
                            fulfillmentMsg = "Legacy Subscription Granted";
                        }
                        d1UpdateOk = true;
                    } catch (err) {
                        console.error("[Webhook] D1 fulfillment failed:", err);
                    }

                    // 3. Log to admin_logs
                    await env.DB.prepare(`
                        INSERT INTO admin_logs (action, details, created_at)
                        VALUES (?, ?, datetime('now'))
                    `).bind("PAYMENT_VERIFIED", `KES ${amountKes} from ${email} | ref: ${ref}`).run();

                    // 4. Broadcast to Admin Hub (real-time toast + sound in dashboard)
                    const payload = { amount: amountKes, email, reference: ref, channel, time: new Date().toLocaleTimeString("en-KE") };
                    try {
                        const hubId = env.ADMIN_HUB.idFromName("global_admin");
                        const hub = env.ADMIN_HUB.get(hubId);
                        await hub.fetch("http://hub/broadcast", {
                            method: "POST",
                            body: JSON.stringify({ type: "PAYMENT_SUCCESS", payload })
                        });
                    } catch (e) {
                        console.error("[Webhook] AdminHub broadcast failed:", e);
                    }

                    // 5. Emergency alert if D1 failed
                    if (!d1UpdateOk) {
                        try {
                            const hubId = env.ADMIN_HUB.idFromName("global_admin");
                            const hub = env.ADMIN_HUB.get(hubId);
                            await hub.fetch("http://hub/broadcast", {
                                method: "POST",
                                body: JSON.stringify({ type: "PAYMENT_RECOVERY_NEEDED", payload: { ...payload, error: "D1 update failed — grant access manually" } })
                            });
                        } catch (_) { }
                    }

                    return new Response("Webhook Handled", { status: 200 });
                }

                return new Response("Event Ignored", { status: 200 });
            }

            // ═══════════════════════════════════════════════════════════════════
            // SUPABASE SIGNUP WEBHOOK — POST /webhooks/supabase-signup
            // Auto-creates a D1 user row + unique referral code the second
            // someone registers. Broadcasts USER_SIGNUP to Admin Hub.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "POST" && path === "/webhooks/supabase-signup") {
                const secret = request.headers.get("x-webhook-secret");
                if (!env.SUPABASE_WEBHOOK_SECRET || secret !== env.SUPABASE_WEBHOOK_SECRET) {
                    return new Response("Forbidden", { status: 403 });
                }

                const { record } = await request.json();
                const { id: supabaseId, email, raw_user_meta_data } = record;
                const fullName = raw_user_meta_data?.full_name || "New DJ";
                const phoneNumber = raw_user_meta_data?.phone || "";
                const referralCode = "DJ" + Math.random().toString(36).substring(2, 7).toUpperCase();

                await env.DB.prepare(`
                    INSERT INTO users (id, supabase_id, email, full_name, phone_number, referral_code, current_plan, daily_download_count, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'none', 0, datetime('now'))
                    ON CONFLICT(email) DO NOTHING
                `).bind(crypto.randomUUID(), supabaseId, email, fullName, phoneNumber, referralCode).run();

                // Notify Admin Hub
                try {
                    const hubId = env.ADMIN_HUB.idFromName("global_admin");
                    const hub = env.ADMIN_HUB.get(hubId);
                    await hub.fetch("http://hub/broadcast", {
                        method: "POST",
                        body: JSON.stringify({ type: "USER_SIGNUP", message: `New signup: ${email}` })
                    });
                } catch (_) { }

                return new Response("Sync OK", { status: 200 });
            }

            // ═══════════════════════════════════════════════════════════════════
            // ADMIN WEBSOCKET UPGRADE — GET /admin/ws
            // Forwards to AdminHub Durable Object for persistent connection.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/admin/ws") {
                const hubId = env.ADMIN_HUB.idFromName("global_admin");
                const hub = env.ADMIN_HUB.get(hubId);
                return hub.fetch(request);
            }

            // ═══════════════════════════════════════════════════════════════════
            // USER PROFILE — GET /api/user/profile
            // Verifies Supabase JWT, looks up D1 user row, returns subscription
            // details including computed days_left.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/user/profile") {
                const authHeader = request.headers.get("Authorization");
                const fingerprint = request.headers.get("x-device-fingerprint") || "unknown";
                const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";

                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const token = authHeader.replace("Bearer ", "");
                let supabaseId = null;
                let jwtEmail = null;
                try {
                    const payloadB64 = token.split(".")[1];
                    const decoded = JSON.parse(atob(payloadB64));
                    supabaseId = decoded.sub;
                    jwtEmail = decoded.email;
                } catch (e) {
                    return new Response("Invalid Token", { status: 401, headers: corsHeaders });
                }

                const user = await env.DB.prepare(`
                    SELECT *,
                    (julianday(subscription_end_date) - julianday('now')) AS days_left
                    FROM users WHERE supabase_id = ? OR email = ?
                `).bind(supabaseId, jwtEmail || "").first();

                if (!user) {
                    const newId = crypto.randomUUID();
                    const refCode = "DJ" + Math.random().toString(36).substring(2, 7).toUpperCase();
                    await env.DB.prepare(`
                        INSERT INTO users (id, supabase_id, email, full_name, referral_code, last_ip, device_fingerprint, created_at)
                        VALUES (?, ?, ?, 'New DJ', ?, ?, ?, datetime('now'))
                        ON CONFLICT(email) DO NOTHING
                    `).bind(newId, supabaseId, jwtEmail || "", refCode, ip, fingerprint).run();

                    return Response.json({
                        id: newId, email: jwtEmail, full_name: "New DJ",
                        is_subscriber: 0, days_left: 0, referral_balance_kes: 0, referral_code: refCode
                    }, { headers: corsHeaders });
                }

                // Security Check: If fingerprint changed and fingerprint count > 2, alert admin (soft guard for now)
                if (user.device_fingerprint && user.device_fingerprint !== fingerprint) {
                    // Update to latest IP/Fingerprint
                    await env.DB.prepare("UPDATE users SET last_ip = ?, device_fingerprint = ? WHERE id = ?")
                        .bind(ip, fingerprint, user.id).run();
                }

                return Response.json({
                    ...user,
                    days_left: Math.max(0, Math.ceil(user.days_left || 0))
                }, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // MANUAL PAYSTACK SYNC — POST /api/admin/sync-paystack
            // Fetches last 20 successful transactions from Paystack API,
            // inserts any missing ones into D1, and re-grants subscriptions.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "POST" && path === "/api/admin/sync-paystack") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                try {
                    const psRes = await fetch(
                        "https://api.paystack.co/transaction?status=success&perPage=20",
                        { headers: { "Authorization": `Bearer ${env.PAYSTACK_SECRET_KEY}` } }
                    );
                    const { data: transactions } = await psRes.json();
                    let synced = 0;

                    for (const tx of (transactions || [])) {
                        const ref = tx.reference;
                        const email = tx.customer?.email || "";
                        const amountKes = (tx.amount || 0) / 100;
                        const channel = tx.channel || "unknown";

                        const existing = await env.DB.prepare("SELECT id FROM payments WHERE id = ?").bind(ref).first();
                        if (!existing) {
                            // Insert payment record
                            await env.DB.prepare(`
                                INSERT INTO payments (id, customer_email, amount_kes, channel, verified_sig, created_at)
                                VALUES (?, ?, ?, ?, 1, datetime('now'))
                                ON CONFLICT(id) DO NOTHING
                            `).bind(ref, email, amountKes, channel).run();

                            // Grant subscription
                            const expiry = new Date();
                            expiry.setDate(expiry.getDate() + 30);
                            await env.DB.prepare(`
                                UPDATE users SET is_subscriber = 1, subscription_end_date = ?
                                WHERE email = ?
                            `).bind(expiry.toISOString(), email).run();

                            synced++;
                        }
                    }

                    // Log + broadcast sync summary
                    await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                        .bind("PAYSTACK_SYNC", `Synced ${synced} missing payments`).run();

                    try {
                        const hubId = env.ADMIN_HUB.idFromName("global_admin");
                        const hub = env.ADMIN_HUB.get(hubId);
                        await hub.fetch("http://hub/broadcast", {
                            method: "POST",
                            body: JSON.stringify({ type: "SYNC_COMPLETE", message: `Paystack Sync: recovered ${synced} payment(s).` })
                        });
                    } catch (_) { }

                    return Response.json({ success: true, synced }, { headers: corsHeaders });
                } catch (err) {
                    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // EXPIRY WATCH — GET /api/admin/expiry-watch
            // Returns users whose subscription expires within ±24 hours.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/admin/expiry-watch") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const { results } = await env.DB.prepare(`
                    SELECT id, full_name, email, phone_number, subscription_end_date,
                           (julianday(subscription_end_date) - julianday('now')) * 24 AS hours_left
                    FROM users
                    WHERE is_subscriber = 1
                    AND subscription_end_date BETWEEN datetime('now', '-1 day') AND datetime('now', '+1 day')
                    ORDER BY subscription_end_date ASC
                `).all();

                return Response.json(results, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // COMMUNITY DIRECTORY — GET /api/admin/users
            // Paginated: ?page=1&limit=50&filter=active|fans|all
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/admin/users") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const filter = url.searchParams.get("filter") || "all";
                const page = parseInt(url.searchParams.get("page") || "1");
                const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
                const offset = (page - 1) * limit;

                let whereClause = "";
                if (filter === "active") whereClause = "WHERE is_subscriber = 1";
                if (filter === "fans") whereClause = "WHERE is_subscriber = 0";

                const { results } = await env.DB.prepare(`
                    SELECT id, full_name, email, phone_number, is_subscriber,
                           subscription_end_date, referral_balance_kes, referral_code, created_at
                    FROM users
                    ${whereClause}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                `).bind(limit, offset).all();

                return Response.json(results, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // COMMUNITY DIRECTORY — PUT /api/admin/users/:id, DELETE /api/admin/users/:id
            // ═══════════════════════════════════════════════════════════════════
            if (path.startsWith("/api/admin/users/")) {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const userId = path.split("/").pop();
                if (!userId) return new Response("User ID required", { status: 400, headers: corsHeaders });

                if (method === "PUT") {
                    try {
                        const updates = await request.json();

                        // Dynamically build the UPDATE query based on provided fields
                        const allowedFields = ['full_name', 'phone_number', 'is_subscriber', 'subscription_end_date', 'referral_balance_kes', 'referral_code'];
                        const setClauses = [];
                        const values = [];

                        for (const field of allowedFields) {
                            if (updates[field] !== undefined) {
                                setClauses.push(`${field} = ?`);
                                values.push(updates[field]);
                            }
                        }

                        if (setClauses.length === 0) {
                            return new Response("No valid fields to update", { status: 400, headers: corsHeaders });
                        }

                        values.push(userId); // for the WHERE id = ? clause

                        const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
                        await env.DB.prepare(query).bind(...values).run();

                        return Response.json({ success: true, message: "User updated" }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                if (method === "DELETE") {
                    try {
                        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
                        return Response.json({ success: true, message: "User deleted" }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // PAYMENTS LOG — GET /api/admin/payments
            // Most recent 100 verified payments for the Payments Tab table.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/admin/payments") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const { results } = await env.DB.prepare(`
                    SELECT id, customer_email, amount_kes, channel, currency, created_at
                    FROM payments
                    ORDER BY created_at DESC
                    LIMIT 100
                `).all();

                return Response.json(results, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // REVIEWS — GET /api/reviews/[:productId], POST /api/reviews
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path.startsWith("/api/reviews")) {
                const parts = path.split("/");
                const productId = parts.length > 3 ? parts.pop() : null;

                let query = "SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC";
                let params = [];

                if (productId) {
                    query = "SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC";
                    params = [productId];
                }

                const { results } = await env.DB.prepare(query).bind(...params).all();
                return Response.json(results, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/reviews") {
                const review = await request.json();
                const id = `rev_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO reviews (id, product_id, user_name, rating, comment, status)
                    VALUES (?, ?, ?, ?, ?, 'approved')
                `).bind(id, review.productId, review.userName, review.rating, review.comment).run();
                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // MIXTAPE COMMENTS — GET /api/mixtapes/comments/[:mixtapeId], POST /api/mixtapes/comments
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path.startsWith("/api/mixtapes/comments")) {
                const parts = path.split("/");
                const mixtapeId = parts.length > 4 ? parts.pop() : null;

                let query = "SELECT * FROM mixtape_comments WHERE status = 'approved' ORDER BY created_at DESC";
                let params = [];

                if (mixtapeId) {
                    query = "SELECT * FROM mixtape_comments WHERE mixtape_id = ? AND status = 'approved' ORDER BY created_at DESC";
                    params = [mixtapeId];
                }

                const { results } = await env.DB.prepare(query).bind(...params).all();
                return Response.json(results, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // STUDIO — GET /api/studio/locations, GET /api/studio/gear
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/studio/locations") {
                const { results } = await env.DB.prepare("SELECT * FROM studio_locations").all();
                const formatted = results.map(l => ({
                    ...l,
                    features: l.features ? JSON.parse(l.features) : []
                }));
                return Response.json(formatted, { headers: corsHeaders });
            }

            if (method === "GET" && path === "/api/studio/gear") {
                const { results } = await env.DB.prepare("SELECT * FROM studio_gear").all();
                return Response.json(results, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // MIXTAPE COMMENTS — GET /api/mixtapes/comments/:mixtapeId, POST /api/mixtapes/comments
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path.startsWith("/api/mixtapes/comments/")) {
                const mixtapeId = path.split("/").pop();
                const { results } = await env.DB.prepare("SELECT * FROM mixtape_comments WHERE mixtape_id = ? AND status = 'approved' ORDER BY created_at DESC").bind(mixtapeId).all();
                return Response.json(results, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/mixtapes/comments") {
                const comment = await request.json();
                const id = `cmt_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO mixtape_comments (id, mixtape_id, user_name, text, status)
                    VALUES (?, ?, ?, ?, 'approved')
                `).bind(id, comment.mixtapeId, comment.userName, comment.text).run();
                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            return new Response("DJ Flowerz API: Operation not found", { status: 404, headers: corsHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    },

    // --- 7. AUTOMATED CLEANUP & REPORTING (Cron) ---
    async scheduled(event, env, ctx) {
        const now = new Date();

        // 1. Cleanup Expired Subscriptions (users table)
        console.log("[Cron] Checking for expired subscriptions...");
        try {
            const { results: expired } = await env.DB.prepare(`
                UPDATE users
                SET is_subscriber = 0
                WHERE is_subscriber = 1 AND subscription_end_date < datetime('now')
                RETURNING id, email
            `).all();

            if (expired.length > 0) {
                console.log(`[Cron] Deactivated ${expired.length} expired users.`);
                const hubId = env.ADMIN_HUB.idFromName("global_admin");
                const hub = env.ADMIN_HUB.get(hubId);
                await hub.fetch("http://hub/broadcast", {
                    method: "POST",
                    body: JSON.stringify({ type: "SUBSCRIPTIONS_EXPIRED", count: expired.length })
                });
                await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                    .bind("SUBS_EXPIRED", `${expired.length} subscriptions expired`).run();
            }
        } catch (e) {
            console.error("[Cron] Expired-sub cleanup failed:", e);
        }

        // 2. Send 24-Hour Expiry Reminder Emails (9 AM EAT = 6 AM UTC)
        if (now.getUTCHours() === 6) {
            console.log("[Cron] Sending expiry reminder emails...");
            try {
                const { results: expiring } = await env.DB.prepare(`
                    SELECT id, email, full_name, subscription_end_date
                    FROM users
                    WHERE is_subscriber = 1
                    AND subscription_end_date BETWEEN datetime('now') AND datetime('now', '+1 day')
                `).all();

                let emailsSent = 0;
                for (const dj of expiring) {
                    if (!env.RESEND_API_KEY) break;
                    try {
                        await fetch("https://api.resend.com/emails", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                from: "DJ Flowerz <promo@djflowerz.co.ke>",
                                to: dj.email,
                                subject: "Don't Stop the Music! 🎧 Your Access Expires Soon",
                                html: `
                                  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
                                    <h2 style="color:#2563eb">Hi ${dj.full_name || 'DJ'},</h2>
                                    <p>Your <strong>DJ Flowerz Music Pool</strong> access expires in less than 24 hours.</p>
                                    <p>Renew now to keep downloading the latest Remixes, Mashups &amp; Video Edits.</p>
                                    <a href="https://djflowerz.co.ke/checkout"
                                       style="display:inline-block;margin-top:12px;padding:14px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">
                                      Renew via Paystack (KES)
                                    </a>
                                    <p style="margin-top:20px;font-size:11px;color:#999">
                                      Already renewed? Ignore this email. 
                                      <a href="https://djflowerz.co.ke/unsubscribe?email=${encodeURIComponent(dj.email)}">Unsubscribe</a>
                                    </p>
                                  </div>
                                `
                            })
                        });
                        emailsSent++;
                    } catch (emailErr) {
                        console.error(`[Cron] Reminder email failed for ${dj.email}:`, emailErr);
                    }
                }

                if (emailsSent > 0) {
                    await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                        .bind("EXPIRY_REMINDERS_SENT", `${emailsSent} reminder emails sent`).run();

                    try {
                        const hubId = env.ADMIN_HUB.idFromName("global_admin");
                        const hub = env.ADMIN_HUB.get(hubId);
                        await hub.fetch("http://hub/broadcast", {
                            method: "POST",
                            body: JSON.stringify({ type: "EXPIRY_REMINDERS_SENT", message: `Automation: ${emailsSent} expiry reminder(s) sent.` })
                        });
                    } catch (_) { }
                }
            } catch (e) {
                console.error("[Cron] Expiry reminder failed:", e);
            }
        }

        // 2. Monthly Business Report (Runs at start of month)
        if (now.getDate() === 1 && now.getHours() === 0) {
            console.log("[Cron] Generating monthly business report...");
            const reportDate = now.toISOString().split('T')[0];
            const fileName = `reports/monthly-stats-${reportDate}.csv`;

            try {
                // Fetch stats
                const { results: stats } = await env.DB.prepare(`
                    SELECT 
                        strftime('%Y-%m', created_at) as month,
                        COUNT(id) as total_orders,
                        SUM(total_amount) as revenue_kes
                    FROM orders 
                    WHERE payment_status = 'paid'
                    GROUP BY month
                    ORDER BY month DESC LIMIT 1
                `).all();

                if (stats.length > 0) {
                    const headers = Object.keys(stats[0]).join(",");
                    const rows = stats.map(row => Object.values(row).join(",")).join("\n");
                    const csvContent = `${headers}\n${rows}`;

                    await env.R2_BUCKET.put(fileName, csvContent, {
                        httpMetadata: { contentType: "text/csv" }
                    });

                    console.log(`[Cron] Report saved to R2: ${fileName}`);

                    // Notify Admin via Log
                    await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                        .bind("REPORT_GENERATED", `Monthly report for ${reportDate} saved to R2: ${fileName}`).run();
                }
            } catch (err) {
                console.error("[Cron] Report generation failed:", err);
            }
        }
    }
};


async function syncPoolToR2(env) {
    const query = `
        SELECT 
            t.*,
            json_group_array(
                json_object(
                    'id', v.id,
                    'version_name', v.version_name,
                    'preview_url', v.preview_url,
                    'download_url', v.download_url,
                    'is_video', v.is_video
                )
            ) as versions
        FROM tracks t
        JOIN track_versions v ON t.id = v.track_id
        GROUP BY t.id
    `;
    const { results } = await env.DB.prepare(query).all();
    const formatted = results.map(r => ({
        ...r,
        versions: JSON.parse(r.versions)
    }));
    await env.R2_BUCKET.put("data/pool_tracks_new.json", JSON.stringify(formatted), {
        httpMetadata: { contentType: "application/json" }
    });
}
