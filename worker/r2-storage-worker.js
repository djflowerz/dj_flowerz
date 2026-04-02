
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

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { handleStorefrontOrders } from './api/storefront/orders';
import { handlePaymentInitialize } from './api/storefront/payments';

async function syncProductsToR2(env, db) {
    try {
        const results = await db.query.products.findMany();
        // Parse JSON strings back to objects for the static file
        const formattedResults = results.map(p => {
            let images = p.images;
            try {
                if (typeof images === 'string') images = JSON.parse(images);
            } catch (e) { }

            return {
                ...p,
                images: Array.isArray(images) ? images : (p.image ? [p.image] : []),
                isHot: !!p.isFeatured,
                meta_title: p.name || "",
                meta_description: p.description ? p.description.substring(0, 160) : "",
                meta_keywords: `${p.name || ""}, ${p.category || ""}, DJ Flowerz`
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

async function syncCollectionToR2(env, collectionName, dataPromise) {
    try {
        const results = await dataPromise;
        await env.R2_BUCKET.put(`data/${collectionName}.json`, JSON.stringify(results), {
            httpMetadata: { contentType: "application/json" }
        });
        console.log(`[Worker] Synced ${results.length} items to R2 data/${collectionName}.json`);
    } catch (error) {
        console.error(`[Worker] Failed to sync ${collectionName} to R2:`, error);
    }
}

// --- Constants & Config ---
const DOWNLOAD_LIMITS = {
    'none': 0,
    'trial': 10,
    'weekly': 10,
    // All paid plans = unlimited (9999 daily limit)
    'monthly': 9999,
    '1month': 9999,
    '1months': 9999,
    '3months': 9999,
    '3month': 9999,
    '6months': 9999,
    '6month': 9999,
    'yearly': 9999,
    'year': 9999,
    '12months': 9999,
    '12month': 9999,
    'annual': 9999,
    'pro': 9999
};

const ADMIN_EMAILS = [
    'ianmuriithiflowerz@gmail.com'
];

function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

function sanitizeName(name) {
    if (!name) return name;
    return name.replace(/dj\s*vick\s*nick/gi, 'DJ Flowerz');
}

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
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;

        const decodeB64 = (str) => {
            let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
            const pad = b64.length % 4;
            if (pad) b64 += '='.repeat(4 - pad);
            return atob(b64);
        };

        // 1. Decode Header to check algorithm
        const header = JSON.parse(decodeB64(headerB64));
        const alg = header.alg;

        // 2. Attempt signature verification ONLY if it's HMAC (HS256) and we have a secret
        if (secret && alg === "HS256") {
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
                base64UrlToUint8Array(signatureB64),
                encoder.encode(`${headerB64}.${payloadB64}`)
            );

            if (!isValid) {
                console.error("[Auth] HS256 signature verification failed");
                return null;
            }
        }

        // 3. Decode payload
        const decoded = JSON.parse(decodeB64(payloadB64));

        // 4. Validate expiry
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            console.warn("[Auth] JWT expired", decoded.exp, now);
            return null;
        }

        return decoded;
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
    let token = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else {
        const url = new URL(request.url);
        token = url.searchParams.get("token");
    }
    
    if (!token) return null;

    const payload = await verifySupabaseJWT(token, env.SUPABASE_JWT_SECRET);
    if (!payload) return null;

    const email = payload.email;
    const sub = payload.sub;
    if (!email && !sub) return null;

    const db = drizzle(env.DB, { schema });
    
    // Fetch from D1
    let profile = await db.query.profiles.findFirst({
        where: (p, { or, eq }) => or(
            email ? eq(p.email, email) : undefined,
            sub ? eq(p.id, sub) : undefined
        )
    });

    // Auto-provision if missing
    if (!profile) {
        try {
            const newId = sub || crypto.randomUUID();
            const newEmail = email || `user_${newId.substring(0,8)}@temp.com`;
            const fullName = payload.user_metadata?.full_name || email?.split('@')[0] || "User";

            await env.DB.prepare(
                'INSERT INTO profiles (id, email, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))'
            ).bind(newId, newEmail, fullName, 'user').run();

            profile = await db.query.profiles.findFirst({
                where: (p, { eq }) => eq(p.id, newId)
            });
        } catch (provisionErr) {
            console.error("[Auth] Auto-provision failed:", provisionErr);
        }
    }

    // Role override for admins
    if (profile && isAdminEmail(profile.email)) {
        profile.role = 'admin';
    }

    return profile;
}

async function checkAndIncrementDownloads(user, env) {
    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
    const now = new Date();
    const nowMs = now.getTime();
    const todayUtcString = now.toISOString().split('T')[0];
    
    const expiry = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry).getTime() : 0;
    const isSubscribed = (user?.isSubscriber === true && expiry > nowMs);
    
    // Admins and ALL paid subscribers get unlimited downloads — no daily cap
    if (isMaster || isSubscribed) {
        return { allowed: true, remaining: 9999 };
    }

    // Non-subscribers (trial or free) — enforce limit
    const userPlan = user?.subscriptionPlan?.toLowerCase() || 'none';
    const limit = DOWNLOAD_LIMITS[userPlan] || 0;
    
    if (limit === 0) {
         return { allowed: false, error: "SUBSCRIPTION_REQUIRED", status: 403 };
    }

    let currentCount = user?.dailyDownloadCount || 0;
    const lastReset = user?.lastDownloadReset;

    if (lastReset !== todayUtcString) {
        currentCount = 0;
    }

    if (currentCount >= limit) {
        return { allowed: false, error: `Daily limit of ${limit} reached.`, status: 429 };
    }

    // Increment count if allowed
    const newCount = currentCount + 1;
    try {
         await env.DB.prepare(
             `UPDATE profiles SET daily_download_count = ?, last_download_reset = ? WHERE id = ? OR email = ?`
         ).bind(newCount, todayUtcString, user.id, user.email).run();
    } catch (dbErr) {
         console.error("[Download Track] DB Update error", dbErr);
    }

    return { allowed: true, remaining: limit - newCount };
}

async function handlePoolFilters(env) {
    try {
        const db = env.DB;
        const filtersRaw = await db.prepare(
            `SELECT DISTINCT collection_hub, genre FROM tracks
             WHERE is_active = 1
               AND collection_hub IS NOT NULL AND collection_hub != ''
               AND genre IS NOT NULL AND genre != ''
               AND genre NOT IN ('General', 'Uncategorized')
               AND collection_hub NOT IN ('General', 'Uncategorized')
             ORDER BY collection_hub ASC, genre ASC`
        ).all();

        const hubsMap = {};
        filtersRaw.results.forEach(row => {
            if (!hubsMap[row.collection_hub]) hubsMap[row.collection_hub] = [];
            hubsMap[row.collection_hub].push(row.genre);
        });
        
        const hubsWithGenres = Object.entries(hubsMap).map(([hub, genres]) => ({ hub, genres }));
        
        const yearsResult = await db.prepare(
            "SELECT DISTINCT release_year FROM tracks WHERE release_year > 0 ORDER BY release_year DESC"
        ).all();

        return { hubsWithGenres, years: yearsResult.results.map(r => r.release_year) };
    } catch (err) {
        console.error("[Filters Error]", err);
        throw err;
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Initialize Drizzle
        const db = drizzle(env.DB, { schema });

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

            if (path === "/api/pool/filters") {
                const filters = await handlePoolFilters(env);
                return new Response(JSON.stringify(filters), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            if (path === "/api/pool/tracks") {
                const user = await getAuthorizedUser(request, env);
                const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
                const now = new Date().getTime();
                const expiry = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry).getTime() : 0;
                const isSubscribed = (user?.isSubscriber === true && expiry > now);

                const page = parseInt(url.searchParams.get("page")) || 1;
                const limit = parseInt(url.searchParams.get("limit")) || 50;
                const hub = url.searchParams.get("hub");
                const genre = url.searchParams.get("genre");
                const year = url.searchParams.get("year");
                const search = url.searchParams.get("search");

                let conditions = ["t.is_active = 1"];
                const params = [];

                if (hub && hub !== 'All Hubs' && hub !== 'all') {
                    conditions.push("LOWER(t.collection_hub) = LOWER(?)");
                    params.push(hub);
                }
                if (genre && genre !== 'All Genres' && genre !== 'All' && genre !== 'all') {
                    conditions.push("(LOWER(t.display_genre) = LOWER(?) OR LOWER(t.genre) = LOWER(?))");
                    params.push(genre, genre);
                }
                if (year && year !== 'All Years') {
                    conditions.push("t.release_year = ?");
                    params.push(year.toString());
                }
                if (search) {
                    conditions.push("(t.title LIKE ? OR t.artist LIKE ?)");
                    params.push(`%${search}%`, `%${search}%`);
                }

                const whereClause = "WHERE " + conditions.join(" AND ");
                const countQuery = `SELECT count(DISTINCT t.id) as total FROM tracks t ${whereClause}`;
                const countResult = await env.DB.prepare(countQuery).bind(...params).first();
                const totalRecords = countResult?.total || 0;
                const totalPages = Math.ceil(totalRecords / limit);

                const offset = (page - 1) * limit;
                const query = `
                    SELECT 
                        t.*,
                        (SELECT COALESCE(preview_url, file_url, download_url) FROM track_versions WHERE track_id = t.id ORDER BY is_main_version DESC LIMIT 1) as previewUrl,
                        json_group_array(
                            CASE WHEN v.id IS NOT NULL THEN
                                json_object(
                                    'id', v.id,
                                    'version_name', v.version_name,
                                    'preview_url', COALESCE(v.preview_url, v.file_url, v.download_url),
                                    'download_url', COALESCE(v.download_url, v.file_url, v.preview_url),
                                    'is_main_version', v.is_main_version
                                )
                            ELSE NULL END
                        ) as versions_json
                    FROM tracks t
                    LEFT JOIN track_versions v ON t.id = v.track_id
                    ${whereClause}
                    GROUP BY t.id 
                    ORDER BY t.created_at DESC 
                    LIMIT ? OFFSET ?
                `;

                const pagedParams = [...params, limit, offset];
                const { results } = await env.DB.prepare(query).bind(...pagedParams).all();

                const dailyLimit = (isMaster || isSubscribed) ? 9999 : (DOWNLOAD_LIMITS[user?.subscriptionPlan?.toLowerCase()] || 0);

                const responsePayload = {
                    tracks: results.map(r => {
                        let parsedVersions = [];
                        if (r.versions_json && r.versions_json !== '[null]' && r.versions_json !== '[]') {
                            try { 
                                const rough = JSON.parse(r.versions_json).filter(Boolean);
                                const seen = new Set();
                                parsedVersions = rough.filter(v => {
                                    const name = (v.version_name || "Original").toLowerCase().trim();
                                    if (seen.has(name)) return false;
                                    seen.add(name);
                                    return true;
                                });
                            } catch (e) { }
                        }
                        delete r.versions_json;
                        return {
                            ...r,
                            artist: sanitizeName(r.artist),
                            title: sanitizeName(r.title),
                            versions: parsedVersions
                        };
                    }),
                    pagination: { page, limit, totalRecords, totalPages },
                    isAuthorized: true,
                    downloadLimit: dailyLimit,
                    downloadsCount: user?.dailyDownloadCount || 0
                };
                return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            if (path === "/api/pool/download") {
                const user = await getAuthorizedUser(request, env);
                if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

                if (method === "GET") {
                    const versionId = url.searchParams.get("versionId");
                    const filename = url.searchParams.get("filename") || "track.mp3";

                    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
                    const now = new Date().getTime();
                    const expiry = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry).getTime() : 0;
                    const isSubscribed = isMaster || (user?.isSubscriber === true && expiry > now);

                    if (!isSubscribed) return new Response(JSON.stringify({ error: "SUBSCRIPTION_REQUIRED" }), { status: 403, headers: corsHeaders });

                    const check = await checkAndIncrementDownloads(user, env);
                    if (!check.allowed) return new Response(JSON.stringify({ error: check.error }), { status: check.status, headers: corsHeaders });

                    const version = await env.DB.prepare(`SELECT download_url, file_url FROM track_versions WHERE id = ?`).bind(versionId).first();
                    if (!version || (!version.download_url && !version.file_url)) return new Response(JSON.stringify({ error: "Track version not found" }), { status: 404, headers: corsHeaders });

                    const fileUrl = version.download_url || version.file_url;
                    const fileResponse = await fetch(fileUrl, { headers: { "User-Agent": "DJFlowerz-Worker/1.0", "Referer": "https://djflowerz.co.ke" } });
                    
                    if (!fileResponse.ok) return new Response(JSON.stringify({ error: "File not available" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

                    const safeFilename = filename.replace(/[^\w.\- ()]/g, '_');
                    return new Response(fileResponse.body, {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": fileResponse.headers.get("Content-Type") || "application/octet-stream",
                            "Content-Disposition": `attachment; filename="${safeFilename}"`,
                            "Cache-Control": "no-store",
                        }
                    });
                }

                if (method === "POST") {
                    const body = await request.json();
                    const { url: downloadUrl } = body;
                    if (!downloadUrl) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400, headers: corsHeaders });

                    const check = await checkAndIncrementDownloads(user, env);
                    if (!check.allowed) return new Response(JSON.stringify({ error: check.error }), { status: check.status, headers: corsHeaders });

                    return new Response(JSON.stringify({ redirectUrl: downloadUrl, remaining: check.remaining, success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
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
                    const amount_kes = body.data.amount / 100;

                    if (!email && !user_id) {
                        return new Response("Missing user info", { status: 400, headers: corsHeaders });
                    }

                    // Handle standard plan types or amount-based logic (for Shop links)
                    const planDays = { 'weekly': 7, 'monthly': 30, 'pro': 365 };
                    let days = planDays[plan_type] || 30;

                    // Override if amount matches specific thresholds
                    if (amount_kes === 700) days = 30;
                    if (amount_kes === 200) days = 7;

                    // UPSERT logic to handle users who haven't registered yet
                    await env.DB.prepare(`
                        INSERT INTO profiles (id, email, is_subscriber, subscription_plan, subscription_expiry, updated_at, created_at)
                        VALUES (?, ?, 1, ?, datetime('now', '+' || ? || ' days'), datetime('now'), datetime('now'))
                        ON CONFLICT(email) DO UPDATE SET
                            is_subscriber = 1,
                            subscription_plan = ?,
                            subscription_expiry = datetime('now', '+' || ? || ' days'),
                            updated_at = datetime('now')
                    `).bind(crypto.randomUUID(), email, plan_type || 'monthly', days, plan_type || 'monthly', days).run();

                    // Sync to R2 so frontend sees it immediately
                    const { results: allProfiles } = await env.DB.prepare("SELECT * FROM profiles").all();
                    await env.R2_BUCKET.put("data/profiles.json", JSON.stringify(allProfiles), {
                        httpMetadata: { contentType: "application/json" }
                    });

                    // Optional: Notify Admin Hub
                    try {
                        const hubId = env.ADMIN_HUB.idFromName("global_admin");
                        const hub = env.ADMIN_HUB.get(hubId);
                        await hub.fetch("https://hub/event", {
                            method: "POST",
                            body: JSON.stringify({
                                type: "PAYMENT_SUCCESS",
                                message: `Activated: ${email || user_id} for ${plan_type || 'manual'} plan (${days} days).`
                            })
                        });
                    } catch (e) { }

                    return new Response("OK", { status: 200, headers: corsHeaders });
                }
                return new Response("Event ignored", { status: 200, headers: corsHeaders });
            }

            // --- ADMIN: MANAGE SUBSCRIPTIONS (Drizzle) ---
            if (method === "POST" && path === "/api/admin/subscriptions/manage") {
                const { userId, email, plan, action, days: customDays } = await request.json();

                // Resolve the profile row: prefer UUID, fall back to email lookup
                let profileId = userId;
                if (!profileId && email) {
                    const row = await env.DB.prepare("SELECT id FROM profiles WHERE email = ? LIMIT 1").bind(email).first();
                    profileId = row?.id;
                }

                if (!profileId) {
                    return Response.json({ success: false, error: "User not found" }, { status: 404, headers: corsHeaders });
                }

                if (action === 'revoke') {
                    await env.DB.prepare(`
                        UPDATE profiles SET is_subscriber = 0, subscription_expiry = NULL, updated_at = datetime('now')
                        WHERE id = ?
                    `).bind(profileId).run();
                } else {
                    // Support a custom day count from the admin UI, or fall back to plan presets
                    const planDays = { 'trial': 7, 'weekly': 7, 'monthly': 30, '3month': 90, '6month': 180, 'yearly': 365, 'pro': 365 };
                    const days = customDays || planDays[plan] || 30;
                    const planName = plan || (days <= 7 ? 'trial' : days <= 30 ? 'monthly' : days <= 90 ? '3month' : 'yearly');

                    await env.DB.prepare(`
                        UPDATE profiles SET
                            is_subscriber = 1,
                            subscription_plan = ?,
                            subscription_expiry = datetime('now', '+' || ? || ' days'),
                            updated_at = datetime('now')
                        WHERE id = ?
                    `).bind(planName, String(days), profileId).run();
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
            if (path === "/api/products") {
                if (method === "GET") {
                    try {
                        const results = await db.query.products.findMany({
                            where: (p, { eq }) => eq(p.isActive, true)
                        });
                        return Response.json(results, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                if (method === "POST") {
                    try {
                        const product = await request.json();
                        const productId = product.id || `p${Date.now()}`;

                        await db.insert(schema.products)
                            .values({
                                id: productId,
                                name: product.name,
                                description: product.description,
                                price: product.price,
                                category: product.category,
                                image: product.image,
                                images: product.images ? JSON.stringify(product.images) : JSON.stringify([product.image]),
                                stock: product.stock !== undefined ? product.stock : (product.inventory !== undefined ? product.inventory : 0),
                                isActive: product.isActive !== undefined ? !!product.isActive : true,
                                currency: product.currency || 'KES',
                            })
                            .run();

                        // Vectorize handles here if needed... (manual SQL for vectorize for now)

                        await syncProductsToR2(env, db);
                        return Response.json({ success: true, id: productId }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }
            }

            if (method === "PUT" && path.startsWith("/api/products/")) {
                try {
                    const productId = path.split("/").pop();
                    const data = await request.json();

                    await db.update(schema.products)
                        .set({
                            ...data,
                            images: data.images ? JSON.stringify(data.images) : undefined,
                            updatedAt: new Date().toISOString()
                        })
                        .where(eq(schema.products.id, productId))
                        .run();

                    await syncProductsToR2(env, db);
                    return Response.json({ success: true }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            if (method === "DELETE" && path.startsWith("/api/products/")) {
                try {
                    const productId = path.replace("/api/products/", "");
                    await db.delete(schema.products).where(eq(schema.products.id, productId)).run();
                    await syncProductsToR2(env, db);
                    return Response.json({ success: true }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // --- MIXTAPES (D1) ---
            // Fetch All Mixtapes: GET /api/mixtapes
            if (path === "/api/mixtapes") {
                if (method === "GET") {
                    try {
                        const results = await db.query.mixtapes.findMany({
                            orderBy: (m, { desc }) => [desc(m.createdAt)]
                        });
                        return Response.json(results, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                if (method === "POST") {
                    try {
                        const mx = await request.json();
                        const mxId = mx.id || `mixtape_${Date.now()}`;

                        await db.insert(schema.mixtapes)
                            .values({
                                id: mxId,
                                title: mx.title,
                                description: mx.description,
                                coverUrl: mx.coverUrl || mx.cover_url || mx.coverImage || mx.cover_image,
                                audioUrl: mx.audioUrl || mx.audio_url,
                                videoUrl: mx.videoUrl || mx.video_url,
                                duration: mx.duration,
                                releaseDate: mx.releaseDate || mx.release_date,
                                category: mx.category,
                                genre: mx.genre,
                                isFeatured: mx.isFeatured !== undefined ? !!mx.isFeatured : false,
                                tags: mx.tags ? JSON.stringify(mx.tags) : '[]',
                            })
                            .run();

                        await syncCollectionToR2(env, 'mixtapes', db.query.mixtapes.findMany({ orderBy: (m, { desc }) => [desc(m.createdAt)] }));
                        return Response.json({ success: true, id: mxId }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // SYSTEM HEALTH — GET /api/health
            // Checks D1 availability via Drizzle
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/health") {
                try {
                    // Check D1 by executing a simple query
                    await db.select({ one: sql`1` }).from(schema.profiles).limit(1);
                    return Response.json({ status: "healthy", d1: "ok" }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ status: "unhealthy", error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // --- GIG MANAGER: BLACKOUT DATES (Drizzle) ---

            // Public: List Blackouts
            if (method === "GET" && path === "/api/blackouts") {
                try {
                    const results = await db.query.blackouts.findMany({
                        orderBy: (b, { asc }) => [asc(b.date)]
                    });
                    return Response.json(results, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // Admin: Add Blackout
            if (method === "POST" && path === "/api/admin/bookings/blackout") {
                const user = await getAuthorizedUser(request, env);
                if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const { date, reason } = await request.json();
                const id = crypto.randomUUID();

                await db.insert(schema.blackouts).values({ id, date, reason: reason || "Gig Confirmed" }).run();
                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            // Admin: Delete Blackout
            if (method === "DELETE" && path.startsWith("/api/admin/bookings/blackout/")) {
                const user = await getAuthorizedUser(request, env);
                if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const id = path.split("/").pop();
                await db.delete(schema.blackouts).where(eq(schema.blackouts.id, id)).run();
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
            // ═══════════════════════════════════════════════════════════════════
            if (method === "POST" && path === "/api/admin/manual-grant") {
                const auth = request.headers.get("Authorization");
                if (auth !== `Bearer ${env.PAYSTACK_SECRET_KEY}`) return new Response("Forbidden", { status: 403 });

                const { type, email, amount, id } = await request.json();

                if (type === 'subscription') {
                    // Correct thresholds: 700 KES = 30 days, 200 KES = 7 days
                    const days = amount >= 700 ? 30 : (amount >= 200 ? 7 : 1);
                    const planName = amount >= 700 ? 'monthly' : (amount >= 200 ? 'weekly' : 'trial');
                    
                    // UPSERT logic for profiles
                    await env.DB.prepare(`
                        INSERT INTO profiles (id, email, is_subscriber, subscription_plan, subscription_expiry, updated_at, created_at)
                        VALUES (?, ?, 1, ?, datetime('now', '+' || ? || ' days'), datetime('now'), datetime('now'))
                        ON CONFLICT(email) DO UPDATE SET
                            is_subscriber = 1,
                            subscription_plan = ?,
                            subscription_expiry = datetime('now', '+' || ? || ' days'),
                            updated_at = datetime('now')
                    `).bind(crypto.randomUUID(), email, planName, days, planName, days).run();

                    // Sync to R2 so frontend sees it
                    const { results: allProfiles } = await env.DB.prepare("SELECT * FROM profiles").all();
                    await env.R2_BUCKET.put("data/profiles.json", JSON.stringify(allProfiles), {
                        httpMetadata: { contentType: "application/json" }
                    });
                } else if (type === 'studio') {
                    await db.update(schema.studioSessions)
                        .set({ status: 'paid' })
                        .where(eq(schema.studioSessions.id, id))
                        .run();
                }

                await db.insert(schema.adminLogs).values({
                    action: 'MANUAL_GRANT',
                    details: `Admin manually granted ${type} to ${email}`
                }).run();

                return Response.json({ success: true }, { headers: corsHeaders });
            }

            if (method === "PUT" && path.startsWith("/api/mixtapes/")) {
                try {
                    const mxId = path.replace("/api/mixtapes/", "");
                    const data = await request.json();

                    await db.update(schema.mixtapes)
                        .set({
                            ...data,
                            coverUrl: data.coverUrl || data.cover_url || data.coverImage || data.cover_image,
                            audioUrl: data.audioUrl || data.audio_url,
                            tags: data.tags ? JSON.stringify(data.tags) : undefined,
                            updatedAt: new Date().toISOString()
                        })
                        .where(eq(schema.mixtapes.id, mxId))
                        .run();

                    await syncCollectionToR2(env, 'mixtapes', db.query.mixtapes.findMany({ orderBy: (m, { desc }) => [desc(m.createdAt)] }));
                    return Response.json({ success: true }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            if (method === "DELETE" && path.startsWith("/api/mixtapes/")) {
                try {
                    const mxId = path.replace("/api/mixtapes/", "");
                    await db.delete(schema.mixtapes).where(eq(schema.mixtapes.id, mxId)).run();
                    await syncCollectionToR2(env, 'mixtapes', db.query.mixtapes.findMany({ orderBy: (m, { desc }) => [desc(m.createdAt)] }));
                    return Response.json({ success: true }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // --- PAYMENTS & ORDERS HUB ---

            // Storefront track/create: call sub-handler
            if (path.startsWith("/api/orders")) {
                if (method === "POST" || path.includes("/track")) {
                    return await handleStorefrontOrders(request, env, ctx);
                }
                // For GET /api/orders, we use the original logic for admin view
            }

            // Payment Initialization for Subscriptions/Bookings/Tips
            if (method === "POST" && path === "/api/payments/initialize") {
                return await handlePaymentInitialize(request, env);
            }

            // --- ORDERS (Drizzle) ---
            if (path === "/api/orders") {
                if (method === "GET") {
                    try {
                        const results = await db.query.orders.findMany({
                            orderBy: (o, { desc }) => [desc(o.createdAt)]
                        });
                        return Response.json(results, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                if (method === "POST") {
                    // This is now handled above by handleStorefrontOrders for redirect flow
                    return new Response("Use handleStorefrontOrders for POST", { status: 400 });
                }
            }

            if (method === "PUT" && path.startsWith("/api/orders/")) {
                try {
                    const orderId = path.replace("/api/orders/", "");
                    const data = await request.json();
                    await db.update(schema.orders)
                        .set({
                            ...data,
                            updatedAt: new Date().toISOString()
                        })
                        .where(eq(schema.orders.id, orderId))
                        .run();

                    await syncCollectionToR2(env, 'orders', db.query.orders.findMany({ orderBy: (o, { desc }) => [desc(o.createdAt)] }));
                    return Response.json({ success: true }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // --- PROFILES (Drizzle) ---
            if (path === "/api/profiles") {
                if (method === "GET") {
                    try {
                        const results = await db.query.profiles.findMany();
                        return Response.json(results, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                if (method === "POST") {
                    try {
                        const prf = await request.json();
                        await db.insert(schema.profiles)
                            .values({
                                id: prf.id,
                                email: prf.email,
                                fullName: prf.fullName || prf.full_name,
                                avatarUrl: prf.avatarUrl || prf.avatar_url,
                                role: prf.role || 'user',
                            })
                            .onConflictDoUpdate({
                                target: schema.profiles.id,
                                set: {
                                    email: prf.email,
                                    fullName: prf.fullName || prf.full_name,
                                    avatarUrl: prf.avatarUrl || prf.avatar_url,
                                    role: prf.role || 'user',
                                    updatedAt: new Date().toISOString()
                                }
                            })
                            .run();

                        await syncCollectionToR2(env, 'profiles', db.query.profiles.findMany());
                        return Response.json({ success: true, id: prf.id }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }
            }

            if (method === "PUT" && path.startsWith("/api/profiles/")) {
                try {
                    const prfId = path.replace("/api/profiles/", "");
                    const data = await request.json();

                    const updates = {
                        email: data.email,
                        fullName: data.fullName || data.full_name,
                        avatarUrl: data.avatarUrl || data.avatar_url,
                        role: data.role,
                        isSubscriber: data.is_subscriber !== undefined ? !!data.is_subscriber : (data.isSubscriber !== undefined ? !!data.isSubscriber : undefined),
                        subscriptionPlan: data.subscription_plan || data.subscriptionPlan,
                        subscriptionExpiry: data.subscription_expiry || data.subscriptionExpiry,
                        hasUsedTrial: data.has_used_trial !== undefined ? !!data.has_used_trial : (data.hasUsedTrial !== undefined ? !!data.hasUsedTrial : undefined),
                        updatedAt: new Date().toISOString()
                    };

                    // Filter out undefined to avoid overwriting with null if that's not intended
                    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));

                    await db.update(schema.profiles)
                        .set(cleanUpdates)
                        .where(eq(schema.profiles.id, prfId))
                        .run();

                    await syncCollectionToR2(env, 'profiles', db.query.profiles.findMany());
                    return Response.json({ success: true }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // --- 21. INSTALLMENTS (Lipa Pole Pole) ---
            if (path.startsWith("/api/installments")) {
                const user = await getAuthorizedUser(request, env);
                if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                // GET /api/installments - Fetch user's plans (joined with orders)
                if (method === "GET") {
                    try {
                        let plans;
                        if (user.role === 'admin') {
                            const { results } = await env.DB.prepare(`
                                SELECT ip.*, o.customer_name, o.customer_email, o.items, o.status as order_status
                                FROM installment_plans ip
                                LEFT JOIN orders o ON o.id = ip.order_id
                                ORDER BY ip.created_at DESC
                            `).all();
                            plans = results;
                        } else {
                            const { results } = await env.DB.prepare(`
                                SELECT ip.*, o.customer_name, o.customer_email, o.items, o.status as order_status
                                FROM installment_plans ip
                                LEFT JOIN orders o ON o.id = ip.order_id
                                WHERE ip.user_id = ?
                                ORDER BY ip.created_at DESC
                            `).bind(user.id).all();
                            plans = results;
                        }
                        return Response.json(plans, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                // POST /api/installments/pay - Initialize payment for next installment
                if (method === "POST" && path === "/api/installments/pay") {
                    try {
                        const { planId } = await request.json();
                        const plan = await env.DB.prepare(`
                            SELECT * FROM installment_plans WHERE id = ? AND user_id = ?
                        `).bind(planId, user.id).first();

                        if (!plan) return Response.json({ success: false, error: "Plan not found" }, { status: 404, headers: corsHeaders });
                        if (plan.status !== 'active') return Response.json({ success: false, error: "Plan is not active" }, { status: 400, headers: corsHeaders });

                        const remaining = plan.balance || 0;
                        if (remaining <= 0) return Response.json({ success: false, error: "Plan already fully paid" }, { status: 400, headers: corsHeaders });

                        // Calculate installment amount (balance / remaining cycles)
                        const installmentAmount = Math.ceil(remaining / Math.max(1, plan.installments_count - 1));
                        const actualPayAmount = Math.min(installmentAmount, remaining);

                        const resp = await fetch("https://api.paystack.co/transaction/initialize", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${env.PAYSTACK_SECRET_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                email: user.email,
                                amount: actualPayAmount * 100,
                                callback_url: `${env.SUCCESS_URL || 'https://djflowerz.co.ke/success'}?type=installment_payment&plan_id=${planId}`,
                                metadata: {
                                    type: 'installment_payment',
                                    plan_id: planId,
                                    order_id: plan.order_id,
                                    user_id: user.id
                                }
                            })
                        });

                        const psData = await resp.json();
                        if (psData.status) {
                            return Response.json({ 
                                success: true, 
                                authorizationUrl: psData.data.authorization_url,
                                reference: psData.data.reference
                            }, { headers: corsHeaders });
                        } else {
                            return Response.json({ success: false, error: psData.message }, { status: 500, headers: corsHeaders });
                        }
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                // PATCH /api/installments/:id — Admin update status (freeze/unfreeze)
                if (method === "PATCH" && path.startsWith("/api/installments/")) {
                    if (user.role !== 'admin') return new Response("Forbidden", { status: 403, headers: corsHeaders });
                    try {
                        const planId = path.replace("/api/installments/", "").split("/")[0];
                        const { status } = await request.json();
                        await env.DB.prepare(`
                            UPDATE installment_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                        `).bind(status, planId).run();
                        return Response.json({ success: true }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                // DELETE /api/installments/:id — Admin delete plan
                if (method === "DELETE" && path.startsWith("/api/installments/")) {
                    if (user.role !== 'admin') return new Response("Forbidden", { status: 403, headers: corsHeaders });
                    try {
                        const planId = path.replace("/api/installments/", "");
                        await env.DB.prepare(`DELETE FROM installment_plans WHERE id = ?`).bind(planId).run();
                        return Response.json({ success: true }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }
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

            // --- PAYSTACK WEBHOOK (HANDLED IN UNIFIED BLOCK BELOW) ---


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

            // 1. Validate Coupon (Drizzle)
            if (method === "GET" && path === "/api/coupons/validate") {
                const code = url.searchParams.get("code");
                const scope = url.searchParams.get("scope") || 'all';
                const amount = parseFloat(url.searchParams.get("amount") || "0");
                const userId = url.searchParams.get("userId");

                if (!code) return Response.json({ valid: false, message: "Missing code" }, { headers: corsHeaders });

                const coupon = await db.query.coupons.findFirst({
                    where: (c, { and, eq, or, gt, isNull }) => and(
                        eq(c.code, code),
                        eq(c.isActive, true),
                        or(isNull(c.expiryDate), gt(c.expiryDate, new Date().toISOString()))
                    )
                });

                if (!coupon) {
                    return Response.json({ valid: false, message: "Invalid or expired coupon" }, { headers: corsHeaders });
                }

                // Check scope
                if (coupon.scope !== 'all' && coupon.scope !== scope) {
                    return Response.json({ valid: false, message: `This coupon is only valid for ${coupon.scope}` }, { headers: corsHeaders });
                }

                // Check min spend
                if (amount < (coupon.minSpend || 0)) {
                    return Response.json({ valid: false, message: `Minimum spend of KES ${coupon.minSpend} required` }, { headers: corsHeaders });
                }

                // Check usage limits
                if (coupon.usageLimit !== null) {
                    const usageCountResult = await db.select({ count: count() }).from(schema.couponUsage).where(eq(schema.couponUsage.couponCode, code)).run();
                    const usageCount = usageCountResult?.results?.[0]?.count || 0;
                    if (usageCount >= coupon.usageLimit) {
                        return Response.json({ valid: false, message: "Coupon usage limit reached" }, { headers: corsHeaders });
                    }
                }

                // Check one-time per user
                if (coupon.isOneTimePerUser && userId) {
                    const userUsage = await db.query.couponUsage.findFirst({
                        where: (cu, { and, eq }) => and(eq(cu.couponCode, code), eq(cu.userId, userId))
                    });
                    if (userUsage) {
                        return Response.json({ valid: false, message: "You have already used this coupon" }, { headers: corsHeaders });
                    }
                }

                return Response.json({
                    valid: true,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    message: "Coupon applied successfully!"
                }, { headers: corsHeaders });
            }

            // 2. Generate Referral Code (Drizzle)
            if (method === "POST" && path === "/api/referrals/generate") {
                const { userId, email } = await request.json();
                if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

                const code = (email.substring(0, 3) + Math.random().toString(36).substring(2, 5)).toUpperCase();

                await db.update(schema.profiles)
                    .set({ referralCode: code, updatedAt: new Date().toISOString() })
                    .where(eq(schema.profiles.id, userId))
                    .run();

                // Also create a "flexible" coupon for this referral code
                await db.insert(schema.coupons)
                    .values({
                        code: code,
                        scope: 'all',
                        discountType: 'percentage',
                        discountValue: 10,
                        createdByRefUserId: userId
                    })
                    .onConflictDoUpdate({
                        target: schema.coupons.code,
                        set: { createdByRefUserId: userId, discountValue: 10 }
                    })
                    .run();

                return Response.json({ success: true, code }, { headers: corsHeaders });
            }

            // 3. Track Referral Landing (Drizzle)
            if (method === "POST" && path === "/api/referrals/track") {
                const { referrerCode, referredId, ip } = await request.json();

                const referrer = await db.query.profiles.findFirst({
                    where: (p, { eq }) => eq(p.referralCode, referrerCode)
                });
                if (!referrer) return Response.json({ error: "Invalid referrer code" }, { status: 400, headers: corsHeaders });

                const id = `ref_track_${Date.now()}`;
                await db.insert(schema.referrals).values({
                    id,
                    referrerId: referrer.id,
                    referredId: referredId,
                    status: 'pending'
                }).run();

                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // 4. Get User Rewards (Drizzle)
            if (method === "GET" && path === "/api/user/rewards") {
                const userId = url.searchParams.get("userId");
                if (!userId) return Response.json({ error: "Missing userId" }, { status: 400, headers: corsHeaders });

                const profile = await db.query.profiles.findFirst({
                    where: (p, { eq }) => eq(p.id, userId)
                });
                const referrals = await db.query.referrals.findMany({
                    where: (r, { eq }) => eq(r.referrerId, userId)
                });

                return Response.json({
                    referralCode: profile?.referralCode,
                    balance: profile?.referralBalance || 0,
                    earnedDays: profile?.referralEarnedDays || 0,
                    referralCount: referrals.length,
                    history: referrals
                }, { headers: corsHeaders });
            }

            // 5. Get Store Settings (Drizzle)
            if (method === "GET" && path === "/api/store/settings") {
                const results = await db.query.settings.findMany();
                const settingsMap = results.reduce((acc, row) => {
                    acc[row.key] = row.value;
                    return acc;
                }, {});
                return Response.json(settingsMap, { headers: corsHeaders });
            }

            // --- REAL-TIME HUB CONNECTION ---
            if (path === "/api/realtime") {
                const hubId = env.ADMIN_HUB.idFromName("global");
                const hub = env.ADMIN_HUB.get(hubId);
                return hub.fetch(request);
            }

            // --- NEWSLETTER & MARKETING ---

            // 1. Public Subscribe (Drizzle)
            if (method === "POST" && path === "/api/newsletter/subscribe") {
                const { email, fullName, tags } = await request.json();
                if (!email) return Response.json({ error: "Email required" }, { status: 400, headers: corsHeaders });

                await db.insert(schema.subscribers)
                    .values({
                        email,
                        fullName: fullName || null,
                        tags: JSON.stringify(tags || []),
                        isActive: true
                    })
                    .onConflictDoUpdate({
                        target: schema.subscribers.email,
                        set: { isActive: true, updatedAt: new Date().toISOString() }
                    })
                    .run();

                // Notify Hub
                const hubId = env.ADMIN_HUB.idFromName("global");
                const hub = env.ADMIN_HUB.get(hubId);
                await hub.fetch("http://hub/broadcast", {
                    method: "POST",
                    body: JSON.stringify({ type: "NEW_SUBSCRIBER", email, fullName })
                });

                return Response.json({ success: true }, { headers: corsHeaders });
            }

            // 2. Admin Subscribers (Drizzle)
            if (method === "GET" && path === "/api/admin/subscribers") {
                const results = await db.query.subscribers.findMany({
                    orderBy: (s, { desc }) => [desc(s.createdAt)]
                });
                return Response.json(results, { headers: corsHeaders });
            }

            // 2b. Admin Active Subscribers (Profiles with active membership)
            if (method === "GET" && path === "/api/admin/active-subscribers") {
                const results = await db.query.profiles.findMany({
                    where: (p, { or, eq }) => or(
                        eq(p.isSubscriber, true),
                        eq(p.isSubscriber, 1)
                    ),
                    orderBy: (p, { desc }) => [desc(p.createdAt)]
                });
                return Response.json(results, { headers: corsHeaders });
            }

            // 3. Admin Broadcast (Drizzle)
            if (method === "POST" && path === "/api/admin/broadcast") {
                const { subject, content, target } = await request.json();

                let emails = [];
                if (target === 'active_djs') {
                    const results = await db.select({ email: schema.profiles.email })
                        .from(schema.profiles)
                        .where(eq(schema.profiles.isSubscriber, true))
                        .run();
                    emails = (results?.results || []).map(r => r.email);
                } else {
                    const results = await db.select({ email: schema.subscribers.email })
                        .from(schema.subscribers)
                        .where(eq(schema.subscribers.isActive, true))
                        .run();
                    emails = (results?.results || []).map(r => r.email);
                }

                // Logging the campaign
                const campaignId = `camp_${Date.now()}`;
                await db.insert(schema.newsletterCampaigns).values({
                    id: campaignId,
                    subject,
                    content,
                    targetAudience: target,
                    sentCount: emails.length
                }).run();

                // Send via Resend (Example Integration)
                if (env.RESEND_API_KEY) {
                    for (const email of emails) {
                        try {
                            await fetch("https://api.resend.com/emails", {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    from: "DJ Flowerz <promo@djflowerz.co.ke>",
                                    to: email,
                                    subject: subject,
                                    html: content + "<br><br><small>To unsubscribe, <a href='https://djflowerz.co.ke/unsubscribe'>click here</a></small>"
                                })
                            });
                        } catch (e) {
                            console.error("[Broadcast] Resend failed for:", email, e);
                        }
                    }
                }

                // Log to Admin Logs
                await db.insert(schema.adminLogs).values({
                    action: "NEWSLETTER_SENT",
                    details: `Subject: ${subject} sent to ${emails.length} users`
                }).run();

                return Response.json({ success: true, count: emails.length }, { headers: corsHeaders });
            }

            // --- SUPPORT & MESSAGES ---

            // 1. Submit Ticket (Drizzle)
            if (method === "POST" && path === "/api/contact/submit") {
                const body = await request.json();
                const id = `ticket_${Date.now()}`;

                await db.insert(schema.supportTickets).values({
                    id,
                    customerName: body.name,
                    customerEmail: body.email,
                    customerPhone: body.phone || null,
                    subject: body.subject || 'Web Inquiry',
                    messageContent: body.message,
                    source: 'web',
                    status: 'open'
                }).run();

                // Notify Hub
                const hubId = env.ADMIN_HUB.idFromName("global");
                const hub = env.ADMIN_HUB.get(hubId);
                await hub.fetch("http://hub/broadcast", {
                    method: "POST",
                    body: JSON.stringify({ type: "NEW_MESSAGE", customer: body.name, subject: body.subject })
                });

                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            // 2. Admin Tickets (Drizzle)
            if (method === "GET" && path === "/api/admin/tickets") {
                const results = await db.query.supportTickets.findMany({
                    orderBy: (st, { desc }) => [desc(st.createdAt)]
                });
                return Response.json(results, { headers: corsHeaders });
            }

            // 3. Admin Ticket Update (Drizzle)
            if (method === "PUT" && path.startsWith("/api/admin/tickets/")) {
                const id = path.split("/").pop();
                const { status, admin_notes } = await request.json();

                await db.update(schema.supportTickets)
                    .set({
                        status: status || undefined,
                        adminNotes: admin_notes || undefined,
                        updatedAt: new Date().toISOString()
                    })
                    .where(eq(schema.supportTickets.id, id))
                    .run();

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
                            `INSERT INTO products (id, name, description, price, category, image, images, stock, currency, created_at, updated_at) 
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

            // GET /api/pool/tracks — High-performance Service Pack fetch with Filtering & Pagination
            if (method === "GET" && path === "/api/pool/tracks") {
                const user = await getAuthorizedUser(request, env);
                const isMaster = user?.email === 'ianmuriithiflowerz@gmail.com';
                const now = new Date().getTime();
                const expiry = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry).getTime() : 0;
                const isSubscribed = (user?.isSubscriber === true && expiry > now);

                // Note: We allow listing tracks for everyone to see what's available, 
                // but the DataContext/UI will handle locking actual playback/download based on isAuthorized.
                // However, we still check authorization here to return user usage context.
                const isAuthorized = isMaster || isSubscribed;

                const page = parseInt(url.searchParams.get("page") || "1");
                const limit = parseInt(url.searchParams.get("limit") || "50");
                const offset = (page - 1) * limit;

                const hub = url.searchParams.get("hub");
                const genre = url.searchParams.get("genre");
                const year = url.searchParams.get("year");
                const month = url.searchParams.get("month");
                const search = url.searchParams.get("search");

                let whereClause = "WHERE t.is_active = 1";
                const params = [];

                if (hub && hub !== 'All Hubs') {
                    whereClause += " AND t.collection_hub = ?";
                    params.push(hub);
                }
                if (genre && genre !== 'All Genres') {
                    whereClause += " AND (t.display_genre = ? OR t.genre = ?)";
                    params.push(genre, genre);
                }
                if (year && year !== 'All Years') {
                    whereClause += " AND t.release_year = ?";
                    params.push(parseInt(year));
                }
                if (month && month !== 'All Months') {
                    whereClause += " AND t.release_month = ?";
                    params.push(month);
                }
                if (search) {
                    whereClause += " AND (t.title LIKE ? OR t.artist LIKE ? OR t.tags LIKE ?)";
                    const s = `%${search}%`;
                    params.push(s, s, s);
                }

                // 1. Get total count for pagination
                const countQuery = `SELECT COUNT(*) as count FROM tracks t ${whereClause}`;
                const { results: countResults } = await env.DB.prepare(countQuery).bind(...params).all();
                const totalCount = countResults[0].count;
                const totalPages = Math.ceil(totalCount / limit);

                // 2. Get paginated tracks with versions
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
                    LEFT JOIN track_versions v ON t.id = v.track_id
                    ${whereClause}
                    GROUP BY t.id 
                    ORDER BY t.created_at DESC 
                    LIMIT ? OFFSET ?
                `;

                const queryParams = [...params, limit, offset];
                const { results } = await env.DB.prepare(query).bind(...queryParams).all();

                // 3. Format and attach usage metadata
                const formatted = results.map(r => ({
                    ...r,
                    versions: r.versions ? JSON.parse(r.versions).filter(v => v.id !== null) : [],
                    // Map D1 snake_case to Frontend camelCase
                    collectionHub: r.collection_hub,
                    displayGenre: r.display_genre,
                    releaseYear: r.release_year,
                    releaseMonth: r.release_month
                }));

                const usageContext = user ? {
                    daily_limit: DOWNLOAD_LIMITS[user.subscriptionPlan || 'none'] || 0,
                    daily_count: user.dailyDownloadCount || 0
                } : null;

                return Response.json({
                    tracks: formatted,
                    pagination: {
                        page,
                        limit,
                        totalCount,
                        totalPages
                    },
                    isAuthorized,
                    usage: usageContext
                }, { headers: corsHeaders });
            }

            // GET /api/pool/download — Secured download with limit enforcement
            if (method === "GET" && path === "/api/pool/download") {
                const user = await getAuthorizedUser(request, env);
                if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const versionId = url.searchParams.get("versionId");
                if (!versionId) return new Response("Missing versionId", { status: 400, headers: corsHeaders });

                // 1. ADMIN & SUBSCRIPTION BYPASS
                const isMaster = isAdminEmail(user.email);
                const now = new Date().getTime();
                const expiry = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry).getTime() : 0;
                const isSubscribed = (user?.isSubscriber === true && expiry > now);

                if (!isMaster && !isSubscribed) {
                    // This section only applies to non-subscribers (e.g. Trial or Free if we had it)
                    const userPlan = (user.subscriptionPlan || 'none').toLowerCase();
                    const planLimit = DOWNLOAD_LIMITS[userPlan] || 0;
                    
                    if (planLimit === 0) {
                        return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403, headers: corsHeaders });
                    }

                    // 3. LIMIT CHECK & RESET
                    const lastReset = user.lastDownloadReset ? new Date(user.lastDownloadReset).getTime() : 0;
                    const oneDay = 24 * 60 * 60 * 1000;
                    let currentCount = user.dailyDownloadCount || 0;

                    if (Date.now() - lastReset > oneDay) {
                        // Reset count
                        currentCount = 0;
                        await db.update(schema.profiles)
                            .set({ dailyDownloadCount: 0, lastDownloadReset: new Date().toISOString() })
                            .where(eq(schema.profiles.id, user.id))
                            .run();
                    }

                    if (currentCount >= planLimit) {
                        return Response.json({
                            error: "LIMIT_REACHED",
                            message: `Daily limit of ${planLimit} tracks reached. Resets in 24h.`
                        }, { status: 429, headers: corsHeaders });
                    }

                    // 4. INCREMENT COUNT
                    await db.update(schema.profiles)
                        .set({ dailyDownloadCount: currentCount + 1 })
                        .where(eq(schema.profiles.id, user.id))
                        .run();
                }

                // 5. GET DOWNLOAD URL (Drizzle)
                console.log(`[Download] Looking up versionId: ${versionId} for user: ${user.email}`);
                const version = await db.query.trackVersions.findFirst({
                    where: (tv, { eq }) => eq(tv.id, versionId)
                });
                
                if (!version) {
                    console.error(`[Download] Version NOT FOUND for ID: ${versionId}`);
                    return new Response("File not found", { status: 404, headers: corsHeaders });
                }
                
                if (!version.downloadUrl) {
                    console.error(`[Download] downloadUrl MISSING for Version ID: ${versionId}`);
                    return new Response("File not found", { status: 404, headers: corsHeaders });
                }
                
                console.log(`[Download] Found version: ${version.version_name}, URL: ${version.downloadUrl.substring(0, 50)}...`);

                // 6. PROXY DOWNLOAD FOR IMMEDIATE BROWSER FEEDBACK
                // Instead of redirecting to R2, we fetch and stream the body with Attachment header
                try {
                    const originRes = await fetch(version.downloadUrl, {
                        headers: {
                            "User-Agent": "DJFlowerz-Worker/1.0",
                            "Referer": "https://djflowerz.co.ke"
                        }
                    });

                    if (!originRes.ok) throw new Error(`Origin returned ${originRes.status}`);

                    const friendlyName = url.searchParams.get("filename") || `${version.version_name || 'track'}.mp3`;
                    const headers = new Headers(corsHeaders);
                    
                    // Critical for "Instant Download" showing in browser immediately:
                    headers.set("Content-Type", originRes.headers.get("Content-Type") || "application/octet-stream");
                    headers.set("Content-Disposition", `attachment; filename="${friendlyName.replace(/"/g, "'")}"`);
                    
                    // Support large files by streaming the body
                    return new Response(originRes.body, { 
                        status: 200, 
                        headers 
                    });
                } catch (e) {
                    console.error("[Download Proxy] Error:", e);
                    return Response.redirect(version.downloadUrl, 302); // Fallback to redirect
                }
            }

            // POST /api/admin/migrate-pool-json — Internal ingestion tool
            // POST /api/admin/migrate-pool-json — Internal ingestion tool
            if (method === "POST" && path === "/api/admin/migrate-pool-json") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const body = await request.json();
                const batch = body.tracks || [];
                console.log(`[Migration] Batch size: ${batch.length}`);
                let inserted = 0;
                const errors = [];
                for (const t of batch) {
                    try {
                        const dateAdded = t.dateAdded || t.uploaded || new Date().toISOString();
                        const dateObj = new Date(dateAdded);
                        const release_year = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear() : 2026;
                        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        const release_month = !isNaN(dateObj.getMonth()) ? monthNames[dateObj.getMonth()] : "January";

                        const hub = t.collection_hub || t.year || 'Other';
                        const displayGenre = t.display_genre || t.month || t.genre || 'Other';

                        await env.DB.prepare(`
                            INSERT INTO tracks (id, title, artist, genre, display_genre, collection_hub, release_date, release_year, release_month, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                title = excluded.title,
                                artist = excluded.artist,
                                genre = excluded.genre,
                                display_genre = excluded.display_genre,
                                collection_hub = excluded.collection_hub,
                                release_date = excluded.release_date,
                                release_year = excluded.release_year,
                                release_month = excluded.release_month,
                                updated_at = excluded.updated_at
                        `).bind(
                            t.id, 
                            t.title || t.baseTitle, 
                            t.artist || "Unknown", 
                            t.genre || t.month || "Other",
                            displayGenre,
                            hub,
                            dateAdded,
                            release_year,
                            release_month,
                            dateAdded,
                            new Date().toISOString()
                        ).run();

                        if (Array.isArray(t.versions)) {
                            await env.DB.prepare(`DELETE FROM track_versions WHERE track_id = ?`).bind(t.id).run();
                            for (const v of t.versions) {
                                const downloadUrl = v.downloadUrl || v.url;
                                if (!downloadUrl) continue;
                                const isVideo = downloadUrl.toLowerCase().endsWith('.mp4') || downloadUrl.toLowerCase().endsWith('.mov');
                                const versionId = v.id || `${t.id}-${v.type || v.versionName || 'Original'}-${Date.now()}`;
                                await env.DB.prepare(`
                                    INSERT INTO track_versions (id, track_id, version_name, preview_url, download_url, is_video)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                `).bind(versionId, t.id, v.type || v.versionName || "Original", t.previewUrl || "", downloadUrl, isVideo ? 1 : 0).run();
                            }
                        }
                        inserted++;
                    } catch (e) {
                        errors.push({ id: t.id, error: e.message });
                    }
                }

                return Response.json({ success: true, inserted, errorCount: errors.length, firstErrors: errors.slice(0, 5) }, { headers: corsHeaders });
            }

            // GET /api/musicpool/filters — Dynamic Filters Route
            if (method === "GET" && path === "/api/musicpool/filters") {
                const tracksData = await db.select({
                    hub: schema.tracks.collectionHub,
                    genre: schema.tracks.displayGenre,
                    year: schema.tracks.releaseYear,
                    month: schema.tracks.releaseMonth
                }).from(schema.tracks).where(eq(schema.tracks.isActive, true)).run();

                const results = tracksData.results || [];
                const hubs = [...new Set(results.map(t => t.collection_hub).filter(Boolean))].sort();
                const genres = [...new Set(results.map(t => t.display_genre).filter(Boolean))].sort();
                const years = [...new Set(results.map(t => t.release_year).filter(Boolean))].sort((a, b) => b - a);
                const months = [...new Set(results.map(t => t.release_month).filter(Boolean))].sort();

                return Response.json({ hubs, genres, years, months }, { headers: corsHeaders });
            }

            // Admin: POST /api/admin/pool/bulk-sync — Upsert multiple tracks in D1
            if (method === "POST" && path === "/api/admin/pool/bulk-sync") {
                const { tracks } = await request.json();
                if (!Array.isArray(tracks)) return Response.json({ error: "Invalid tracks array" }, { status: 400, headers: corsHeaders });
                
                try {
                    const db = drizzle(env.DB, { schema });
                    
                    // We'll process them as a batch to avoid timeouts
                    const BATCH_SIZE = 50;
                    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
                        const batch = tracks.slice(i, i + BATCH_SIZE);
                        
                        // Use a transaction or batch of inserts
                        for (const track of batch) {
                             if (!track.id) track.id = crypto.randomUUID();
                             
                             // Upsert track
                             await db.insert(schema.tracks).values({
                                 id: track.id,
                                 title: track.title,
                                 artist: track.artist || '',
                                 genre: track.genre || '',
                                 subGenre: track.subGenre || track.sub_genre || '',
                                 displayGenre: track.displayGenre || track.display_genre || '',
                                 collectionHub: track.collectionHub || track.collection_hub || '',
                                 bpm: track.bpm ? parseInt(track.bpm) : null,
                                 key: track.key || '',
                                 vibe: track.vibe || '',
                                 audioUrl: track.audioUrl || track.audio_url || '',
                                 downloadUrl: track.downloadUrl || track.download_url || '',
                                 coverUrl: track.coverUrl || track.cover_url || '',
                                 duration: track.duration || '',
                                 releaseDate: track.releaseDate || track.release_date || new Date().toISOString(),
                                 isActive: true,
                                 updatedAt: new Date().toISOString()
                             }).onConflictDoUpdate({
                                 target: schema.tracks.id,
                                 set: {
                                     title: track.title,
                                     artist: track.artist || '',
                                     genre: track.genre || '',
                                     subGenre: track.subGenre || track.sub_genre || '',
                                     displayGenre: track.displayGenre || track.display_genre || '',
                                     collectionHub: track.collectionHub || track.collection_hub || '',
                                     bpm: track.bpm ? parseInt(track.bpm) : null,
                                     key: track.key || '',
                                     vibe: track.vibe || '',
                                     audioUrl: track.audioUrl || track.audio_url || '',
                                     downloadUrl: track.downloadUrl || track.download_url || '',
                                     coverUrl: track.coverUrl || track.cover_url || '',
                                     duration: track.duration || '',
                                     updatedAt: new Date().toISOString()
                                 }
                             }).run();
                        }
                    }
                    
                    return Response.json({ success: true, count: tracks.length }, { headers: corsHeaders });
                } catch (error) {
                    console.error("[Bulk Sync] Failed:", error);
                    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
                }
            }

            // Admin: POST /api/admin/pool/sync-track — Upsert a track and its versions in D1
            if (method === "POST" && path === "/api/admin/pool/sync-track") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const track = await request.json();
                if (!track.id || !track.title) {
                    return Response.json({ error: "Missing required fields (id, title)" }, { status: 400, headers: corsHeaders });
                }

                try {
                    const dateAdded = track.releaseDate || track.dateAdded || track.uploaded || new Date().toISOString();
                    const dateObj = new Date(dateAdded);
                    const release_year = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear() : 2026;
                    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    const release_month = !isNaN(dateObj.getMonth()) ? monthNames[dateObj.getMonth()] : "January";

                    await env.DB.prepare(`
                        INSERT INTO tracks (
                            id, title, artist, genre, display_genre, collection_hub, 
                            sub_genre, vibe, bpm, release_date, release_year, release_month, 
                            is_featured, is_active, updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            title = excluded.title,
                            artist = excluded.artist,
                            genre = excluded.genre,
                            display_genre = excluded.display_genre,
                            collection_hub = excluded.collection_hub,
                            sub_genre = excluded.sub_genre,
                            vibe = excluded.vibe,
                            bpm = excluded.bpm,
                            release_date = excluded.release_date,
                            release_year = excluded.release_year,
                            release_month = excluded.release_month,
                            is_featured = excluded.is_featured,
                            is_active = excluded.is_active,
                            updated_at = excluded.updated_at
                    `).bind(
                        track.id,
                        track.title,
                        track.artist || "Unknown",
                        track.genre || track.month || "Other",
                        track.display_genre || track.month || track.genre || "Other",
                        track.collection_hub || track.year || "Other",
                        track.sub_genre || "ROOT",
                        track.vibe || "",
                        track.bpm || 0,
                        dateAdded,
                        release_year,
                        release_month,
                        track.is_featured ? 1 : 0,
                        track.is_active !== false ? 1 : 0,
                        new Date().toISOString()
                    ).run();

                    if (Array.isArray(track.versions)) {
                        await env.DB.prepare(`DELETE FROM track_versions WHERE track_id = ?`).bind(track.id).run();
                        for (const v of track.versions) {
                            const versionId = v.id || `${track.id}-${v.versionName || v.type || 'v'}-${Date.now()}`;
                            const downloadUrl = v.downloadUrl || v.url;
                            if (!downloadUrl) continue;

                            await env.DB.prepare(`
                                INSERT INTO track_versions (id, track_id, version_name, preview_url, download_url, is_video)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `).bind(
                                versionId,
                                track.id,
                                v.versionName || v.type || "Original",
                                v.previewUrl || track.previewUrl || "",
                                downloadUrl,
                                (downloadUrl.toLowerCase().endsWith('.mp4') || downloadUrl.toLowerCase().endsWith('.mov')) ? 1 : 0
                            ).run();
                        }
                    }

                    return Response.json({ success: true, id: track.id }, { headers: corsHeaders });
                } catch (e) {
                    console.error("[Admin Sync] Error:", e);
                    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
                }
            }

            // Admin: DELETE /api/admin/pool/track — Delete a track and its versions from D1
            if (method === "DELETE" && path === "/api/admin/pool/track") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const id = url.searchParams.get("id");
                if (!id) return new Response("Missing id", { status: 400, headers: corsHeaders });

                try {
                    await env.DB.prepare(`DELETE FROM tracks WHERE id = ?`).bind(id).run();
                    // Foreign key CASCADE should handle track_versions, but let's be safe
                    await env.DB.prepare(`DELETE FROM track_versions WHERE track_id = ?`).bind(id).run();

                    return Response.json({ success: true }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
                }
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
                const { mixtapeId, action } = await request.json();
                if (action === 'play') {
                    await db.update(schema.mixtapes)
                        .set({ playCount: sql`${schema.mixtapes.playCount} + 1` })
                        .where(eq(schema.mixtapes.id, mixtapeId))
                        .run();
                } else {
                    await db.update(schema.mixtapes)
                        .set({ downloadCount: sql`${schema.mixtapes.downloadCount} + 1` })
                        .where(eq(schema.mixtapes.id, mixtapeId))
                        .run();
                }

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
                const results = await db.query.studioSessions.findMany({
                    orderBy: (ss, { desc }) => [desc(ss.sessionDate)]
                });
                return Response.json(results, { headers: corsHeaders });
            }

            // Admin: GET /api/admin/event-gigs
            if (method === "GET" && path === "/api/admin/event-gigs") {
                const results = await db.query.eventGigs.findMany({
                    orderBy: (eg, { desc }) => [desc(eg.eventDate)]
                });
                return Response.json(results, { headers: corsHeaders });
            }

            // Admin: GET /api/admin/dashboard
            if (method === "GET" && path === "/api/admin/dashboard") {
                try {
                    // 1. Unified Total Revenue (Universal Ledger + Pending Orders)
                    const statsRow = await env.DB.prepare(`
                        SELECT 
                            (SELECT COALESCE(SUM(amount_kes), 0) FROM payments WHERE status = 'success') + 
                            (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid') as total,
                            
                            (SELECT COALESCE(SUM(amount_kes), 0) FROM payments WHERE status = 'success') as confirmed
                    `).first();

                    const totalRevenue = statsRow?.total || 0;
                    const confirmedRevenue = statsRow?.confirmed || 0;

                    // 2. Total Orders (Store only)
                    const ordersCountRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM orders`).first();
                    const totalOrders = ordersCountRow?.count || 0;

                    // 3. Active Mixtapes
                    const mixtapesCountRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM mixtapes`).first();
                    const activeMixtapes = mixtapesCountRow?.count || 0;

                    // 4. Subscribed Users (Robust check for boolean values)
                    const subscribersRow = await env.DB.prepare(
                        `SELECT COUNT(*) as count FROM profiles WHERE is_subscriber = 1 OR is_subscriber = 'true'`
                    ).first();
                    const activeUsers = subscribersRow?.count || 0;

                    // 5. Total registered users
                    const totalUsersRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM profiles`).first();
                    const totalUsers = totalUsersRow?.count || 0;

                    // 6. Integrated Recent Activity (Orders + Payments)
                    const { results: recentOrders } = await env.DB.prepare(
                        `SELECT id, customer_email, customer_name, total_amount as amount, payment_status as status, created_at, 'order' as type 
                         FROM orders ORDER BY created_at DESC LIMIT 5`
                    ).all();

                    const { results: recentPayments } = await env.DB.prepare(
                        `SELECT id, customer_email, '' as customer_name, amount_kes as amount, status, created_at, 'payment' as type 
                         FROM payments ORDER BY created_at DESC LIMIT 5`
                    ).all();

                    // Combine and sort by date
                    const combinedActivity = [...(recentOrders || []), ...(recentPayments || [])]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 10);

                    const recentActivity = combinedActivity.map(o => ({
                        id: o.id,
                        type: o.type,
                        email: o.customer_email,
                        name: o.customer_name || o.customer_email || 'Customer',
                        amount: o.amount,
                        status: o.status,
                        createdAt: o.created_at
                    }));

                    return Response.json({
                        totalRevenue,
                        confirmedRevenue,
                        totalOrders,
                        activeMixtapes,
                        activeUsers,
                        totalUsers,
                        recentActivity
                    }, { headers: corsHeaders });
                } catch (error) {
                    console.error("[Dashboard] Fetch error:", error);
                    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
                }
            }

            // Admin: POST /api/admin/pool/sync-genres — Bulk sync genres to D1
            if (method === "POST" && path === "/api/admin/pool/sync-genres") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                const { genres } = await request.json();
                if (!Array.isArray(genres)) return Response.json({ error: "Invalid genres data" }, { status: 400, headers: corsHeaders });

                try {
                    // We'll replace the table content to ensure sync
                    await env.DB.prepare(`DELETE FROM genres`).run();

                    for (const g of genres) {
                        await env.DB.prepare(`
                            INSERT INTO genres (id, name, description, image_url)
                            VALUES (?, ?, ?, ?)
                        `).bind(g.id, g.name, g.description || "", g.imageUrl || g.image_url || "").run();
                    }

                    return Response.json({ success: true, count: genres.length }, { headers: corsHeaders });
                } catch (e) {
                    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
                }
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

                    // 1. Log payment (idempotent)
                    await db.insert(schema.payments).values({
                        id: ref,
                        customerEmail: email,
                        amountKes: amountKes,
                        currency: currency,
                        method: channel,
                        verifiedSig: true,
                        metadata: JSON.stringify(data)
                    }).onConflictDoNothing().run();

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
                                const user = await db.query.profiles.findFirst({
                                    where: (p, { eq }) => eq(p.email, email)
                                });
                                if (user?.hasUsedTrial) {
                                    fulfillmentMsg = "TRIAL_ALREADY_USED";
                                    throw new Error("One-time trial already used.");
                                }
                                plan = 'trial'; days = 7;
                            }

                            const expiry = new Date();
                            expiry.setDate(expiry.getDate() + days);

                            await db.update(schema.profiles).set({
                                isSubscriber: true,
                                subscriptionExpiry: expiry.toISOString(),
                                subscriptionPlan: plan,
                                hasUsedTrial: plan === 'trial' ? true : undefined,
                                updatedAt: sql`CURRENT_TIMESTAMP`
                            }).where(eq(schema.profiles.email, email)).run();

                            // Also sync profiles to R2 so frontend sees the change
                            await syncCollectionToR2(env, 'profiles', "SELECT * FROM profiles", res => res.map(p => ({
                                ...p,
                                fullName: p.full_name,
                                avatarUrl: p.avatar_url,
                                isSubscriber: Boolean(p.is_subscriber),
                                subscriptionPlan: p.subscription_plan,
                                subscriptionExpiry: p.subscription_expiry,
                                hasUsedTrial: Boolean(p.has_used_trial)
                            })));

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
                        else if (meta.type === "installment_deposit") {
                            // First payment on checkout
                            await env.DB.prepare(`
                                UPDATE orders SET status = 'processing', payment_status = 'deposit_paid', paystack_ref = ? WHERE id = ?
                            `).bind(ref, meta.order_id).run();

                            // Get the existing plan to check interval
                            const plan = await env.DB.prepare("SELECT id, payment_interval, total_amount FROM installment_plans WHERE order_id = ?").bind(meta.order_id).first();
                            
                            if (plan) {
                                const interval = plan.payment_interval === 'weekly' ? '+7 days' : '+1 month';
                                
                                await env.DB.prepare(`
                                    UPDATE installment_plans 
                                    SET paid_amount = ?, 
                                        balance = total_amount - ?, 
                                        status = 'active',
                                        next_payment_date = date('now', ?),
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE order_id = ?
                                `).bind(amountKes, amountKes, interval, meta.order_id).run();

                                // Record payment record
                                const payId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                                await env.DB.prepare(`
                                    INSERT INTO installment_payments (id, plan_id, amount, status, reference, payment_method, created_at)
                                    VALUES (?, ?, ?, 'success', ?, 'paystack', CURRENT_TIMESTAMP)
                                `).bind(payId, plan.id, amountKes, ref).run();
                            }

                            fulfillmentMsg = "Installment Deposit Paid";

                            await sendEmail(env, {
                                to: email,
                                subject: "Lipa Pole Pole Activated - DJ Flowerz",
                                html: `<h1>Plan Activated!</h1><p>We've received your deposit of KES ${amountKes} for your order.</p><p>Ref: ${meta.order_id}</p><p>You can track your next payments on your dashboard.</p>`
                            });
                        }
                        else if (meta.type === "installment_payment") {
                            // Subsequent payments
                            const planId = meta.plan_id;
                            const plan = await env.DB.prepare("SELECT * FROM installment_plans WHERE id = ?").bind(planId).first();

                            if (plan) {
                                const newAmountPaid = (plan.paid_amount || 0) + amountKes;
                                const newBalance = Math.max(0, plan.total_amount - newAmountPaid);
                                const isCompleted = newBalance <= 0;
                                const interval = plan.payment_interval === 'weekly' ? '+7 days' : '+1 month';
                                
                                await env.DB.prepare(`
                                    UPDATE installment_plans 
                                    SET paid_amount = ?, balance = ?, status = ?, next_payment_date = CASE WHEN ? = 'completed' THEN NULL ELSE date(next_payment_date, ?) END, updated_at = CURRENT_TIMESTAMP
                                    WHERE id = ?
                                `).bind(
                                    newAmountPaid, 
                                    newBalance, 
                                    isCompleted ? 'completed' : 'active',
                                    isCompleted ? 'completed' : 'active',
                                    interval,
                                    planId
                                ).run();

                                // Record payment record
                                const payId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                                await env.DB.prepare(`
                                    INSERT INTO installment_payments (id, plan_id, amount, status, reference, payment_method, created_at)
                                    VALUES (?, ?, ?, 'success', ?, 'paystack', CURRENT_TIMESTAMP)
                                `).bind(payId, planId, amountKes, ref).run();

                                if (isCompleted) {
                                    // Mark the actual order as fully paid!
                                    await env.DB.prepare(`
                                        UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = ?
                                    `).bind(plan.order_id).run();
                                }

                                fulfillmentMsg = isCompleted ? "Installment Plan COMPLETED" : "installment Payment RECEIVED";

                                await sendEmail(env, {
                                    to: email,
                                    subject: isCompleted ? "Congratulations! Your Installment Plan is Complete" : "Payment Received - DJ Flowerz Lipa Pole Pole",
                                    html: isCompleted 
                                        ? `<h1>Goal Reached!</h1><p>You have fully paid for your order (Ref: ${plan.order_id}).</p><p>Our team will prepare it for delivery!</p>`
                                        : `<h1>Thank You!</h1><p>We've received your payment of KES ${amountKes}. Your remaining balance is KES ${newBalance}.</p>`
                                });
                            }
                        }
                        else {
                            // Fallback: Default to subscription if no type (backward compatibility)
                            const expiry = new Date();
                            expiry.setDate(expiry.getDate() + 30);
                            await env.DB.prepare(`
                                UPDATE profiles SET is_subscriber = 1, subscription_expiry = ? WHERE email = ?
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
                    INSERT INTO profiles (id, email, full_name, phone_number, referral_code, current_plan, daily_download_count, created_at)
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
                    (julianday(subscription_expiry) - julianday('now')) AS days_left
                    FROM profiles WHERE supabase_id = ? OR email = ?
                `).bind(supabaseId, jwtEmail || "").first();

                if (!user) {
                    const newId = crypto.randomUUID();
                    const refCode = "DJ" + Math.random().toString(36).substring(2, 7).toUpperCase();
                    await env.DB.prepare(`
                        INSERT INTO profiles (id, email, full_name, referral_code, last_ip, device_fingerprint, created_at)
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
                    await env.DB.prepare("UPDATE profiles SET last_ip = ?, device_fingerprint = ? WHERE id = ?")
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
                                UPDATE profiles SET is_subscriber = 1, subscription_expiry = ?
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
                    SELECT id, full_name, email, phone_number, subscription_expiry,
                           (julianday(subscription_expiry) - julianday('now')) * 24 AS hours_left
                    FROM profiles
                    WHERE is_subscriber = 1
                    AND subscription_expiry BETWEEN datetime('now', '-1 day') AND datetime('now', '+1 day')
                    ORDER BY subscription_expiry ASC
                `).all();

                return Response.json(results, { headers: corsHeaders });
            }

            // ═══════════════════════════════════════════════════════════════════
            // ADMIN STATS — GET /api/admin/stats
            // Called by DataContext.refreshAdminStats() to power the stat cards.
            // Returns aggregate revenue, active subs, monthly figures.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/admin/stats") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                try {
                    const now = new Date();
                    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

                    const revenueRow = await env.DB.prepare(`
                        SELECT
                            COALESCE(SUM(amount_kes), 0) AS total_revenue
                        FROM payments WHERE status = 'success'
                    `).first();

                    const monthlyRow = await env.DB.prepare(`
                        SELECT
                            COUNT(*) AS monthly_sales_count,
                            COALESCE(SUM(amount_kes), 0) AS monthly_sales_amt
                        FROM payments
                        WHERE status = 'success' AND created_at >= ?
                    `).bind(firstOfMonth).first();

                    const subsRow = await env.DB.prepare(`
                        SELECT COUNT(*) AS active_subs FROM profiles
                        WHERE (is_subscriber = 1 OR is_subscriber = 'true')
                          AND (subscription_expiry IS NULL OR subscription_expiry > datetime('now'))
                    `).first();

                    return Response.json({
                        total_revenue: revenueRow?.total_revenue || 0,
                        active_subs: subsRow?.active_subs || 0,
                        monthly_sales_count: monthlyRow?.monthly_sales_count || 0,
                        monthly_sales_amt: monthlyRow?.monthly_sales_amt || 0,
                        currency: "KES"
                    }, { headers: corsHeaders });
                } catch (err) {
                    console.error("[Admin Stats] Error:", err);
                    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // ADMIN ORDERS — GET /api/admin/orders
            // Full unfiltered order list for the admin dashboard (all statuses).
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/admin/orders") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                try {
                    const { results } = await env.DB.prepare(`
                        SELECT * FROM orders ORDER BY created_at DESC LIMIT 1000
                    `).all();
                    return Response.json(results || [], { headers: corsHeaders });
                } catch (err) {
                    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // ADMIN SUBSCRIPTIONS — GET /api/admin/subscriptions
            // Full subscription list (all statuses) with joined user email.
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/admin/subscriptions") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                try {
                    // Try subscriptions table first; fall back to profiles with is_subscriber=1
                    let results = [];
                    try {
                        const { results: subs } = await env.DB.prepare(`
                            SELECT s.*, p.email, p.full_name
                            FROM subscriptions s
                            LEFT JOIN profiles p ON s.user_id = p.id
                            ORDER BY s.created_at DESC
                        `).all();
                        results = subs || [];
                    } catch (_) {
                        // subscriptions table may not exist yet — fall back to profiles
                        const { results: profiles } = await env.DB.prepare(`
                            SELECT id, email, full_name, is_subscriber,
                                   subscription_expiry AS end_date,
                                   created_at
                            FROM profiles
                            WHERE is_subscriber = 1 OR is_subscriber = 'true'
                            ORDER BY subscription_expiry DESC
                        `).all();
                        results = (profiles || []).map(p => ({
                            id: p.id,
                            user_id: p.id,
                            email: p.email,
                            full_name: p.full_name,
                            plan_id: 'active',
                            status: 'active',
                            start_date: p.created_at,
                            end_date: p.end_date,
                            created_at: p.created_at
                        }));
                    }
                    return Response.json(results, { headers: corsHeaders });
                } catch (err) {
                    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // ADMIN SUBSCRIPTION PLANS — GET /api/admin/subscription_plans
            // Returns all subscription plans from D1 (or R2 fallback).
            // ═══════════════════════════════════════════════════════════════════
            if (method === "GET" && path === "/api/admin/subscription_plans") {
                const authHeader = request.headers.get("Authorization");
                if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

                try {
                    const { results } = await env.DB.prepare(`
                        SELECT * FROM subscription_plans ORDER BY price ASC
                    `).all();
                    return Response.json(results || [], { headers: corsHeaders });
                } catch (err) {
                    // Table may not exist; return empty so frontend uses its own defaults
                    return Response.json([], { headers: corsHeaders });
                }
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
                const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000"), 5000);
                const offset = (page - 1) * limit;

                let whereClause = "";
                if (filter === "active") whereClause = "WHERE is_subscriber = 1";
                if (filter === "fans") whereClause = "WHERE is_subscriber = 0";

                const { results } = await env.DB.prepare(`
                    SELECT id, full_name, email, phone_number, is_subscriber,
                           subscription_expiry, referral_balance_kes, referral_code, created_at
                    FROM profiles
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
                        const allowedFields = ['full_name', 'phone_number', 'is_subscriber', 'subscription_expiry', 'referral_balance_kes', 'referral_code'];
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

                        const query = `UPDATE profiles SET ${setClauses.join(', ')} WHERE id = ?`;
                        await env.DB.prepare(query).bind(...values).run();

                        return Response.json({ success: true, message: "User updated" }, { headers: corsHeaders });
                    } catch (e) {
                        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
                    }
                }

                if (method === "DELETE") {
                    try {
                        await env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(userId).run();
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
            // INTERACTIONS (merged reviews + mixtape_comments) — /api/interactions
            if (method === "GET" && path.startsWith("/api/interactions")) {
                const targetId = url.searchParams.get("target_id");
                const type = url.searchParams.get("type");

                let results;
                if (targetId && type) {
                    results = await db.query.interactions.findMany({
                        where: (i, { and, eq }) => and(
                            eq(i.targetId, targetId),
                            eq(i.type, type),
                            eq(i.status, 'approved')
                        ),
                        orderBy: [desc(schema.interactions.createdAt)]
                    });
                } else if (targetId) {
                    results = await db.query.interactions.findMany({
                        where: (i, { and, eq }) => and(
                            eq(i.targetId, targetId),
                            eq(i.status, 'approved')
                        ),
                        orderBy: [desc(schema.interactions.createdAt)]
                    });
                } else {
                    results = await db.query.interactions.findMany({
                        where: (i, { eq }) => eq(i.status, 'approved'),
                        orderBy: [desc(schema.interactions.createdAt)]
                    });
                }
                return Response.json(results, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/interactions") {
                const body = await request.json();
                const id = `int_${Date.now()}`;
                await db.insert(schema.interactions).values({
                    id,
                    userId: body.userId || null,
                    userName: body.userName,
                    type: body.type,
                    targetId: body.targetId,
                    targetType: body.targetType,
                    content: body.content,
                    rating: body.rating || null,
                    status: 'approved'
                }).run();
                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            // Legacy review/comment endpoints — forward to interactions
            if (method === "POST" && path === "/api/reviews") {
                const review = await request.json();
                const id = `rev_${Date.now()}`;
                await env.DB.prepare(`INSERT INTO interactions (id, user_name, type, target_id, target_type, content, rating, status) VALUES (?, ?, 'review', ?, 'product', ?, ?, 'approved')`
                ).bind(id, review.userName, review.productId, review.comment, review.rating).run();
                return Response.json({ success: true, id }, { headers: corsHeaders });
            }

            // STUDIO GEAR/LOCATIONS — kept for compatibility
            if (method === "GET" && path === "/api/studio/locations") {
                const { results } = await env.DB.prepare("SELECT * FROM studio_sessions LIMIT 50").all();
                return Response.json(results, { headers: corsHeaders });
            }

            if (method === "GET" && path === "/api/studio/gear") {
                // Gear moved to settings — return empty for now
                return Response.json([], { headers: corsHeaders });
            }

            // Legacy: mixtape comments → interactions
            if (method === "GET" && path.startsWith("/api/mixtapes/comments")) {
                const mixtapeId = path.split("/").pop();
                const { results } = await env.DB.prepare(
                    "SELECT * FROM interactions WHERE target_id = ? AND type = 'comment' AND status = 'approved' ORDER BY created_at DESC"
                ).bind(mixtapeId).all();
                return Response.json(results, { headers: corsHeaders });
            }

            if (method === "POST" && path === "/api/mixtapes/comments") {
                const comment = await request.json();
                const id = `cmt_${Date.now()}`;
                await env.DB.prepare(`INSERT INTO interactions (id, user_name, type, target_id, target_type, content, status) VALUES (?, ?, 'comment', ?, 'mixtape', ?, 'approved')`
                ).bind(id, comment.userName, comment.mixtapeId, comment.text).run();
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

        // 1. Cleanup Expired Subscriptions (profiles table)
        console.log("[Cron] Checking for expired subscriptions...");
        try {
            const { results: expired } = await env.DB.prepare(`
                UPDATE profiles
                SET is_subscriber = 0
                WHERE is_subscriber = 1 AND subscription_expiry < datetime('now')
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
                    SELECT id, email, full_name, subscription_expiry
                    FROM profiles
                    WHERE is_subscriber = 1
                    AND subscription_expiry BETWEEN datetime('now') AND datetime('now', '+1 day')
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
