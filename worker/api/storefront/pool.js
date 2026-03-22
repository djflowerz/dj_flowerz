
import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';

function sanitizeName(name) {
    if (!name) return name;
    return name.replace(/dj\s*vick\s*nick/gi, 'DJ Flowerz');
}

async function checkAndIncrementDownloads(user, env, isAdminEmail) {
    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
    const now = new Date();
    const nowMs = now.getTime();
    const todayUtcString = now.toISOString().split('T')[0];
    const createdDate = new Date(user?.created_at || now.toISOString());
    const daysSinceCreated = Math.floor((nowMs - createdDate.getTime()) / (1000 * 3600 * 24));
    
    const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
    const isSubscribed = (user?.is_subscriber === 1 && expiry > nowMs);
    
    let limit = 0;
    const userPlan = user?.subscription_plan?.toLowerCase() || 'none';

    if (isMaster) {
        limit = 9999;
    } else if (isSubscribed) {
        if (userPlan === 'trial') {
            limit = 10;
        } else if (userPlan === 'monthly') {
            limit = 30;
        } else {
            limit = 200;
        }
    } else {
        if (daysSinceCreated <= 7) {
            limit = 10;
        } else {
            limit = 0;
        }
    }
    
    if (limit === 0) {
         return { allowed: false, error: "SUBSCRIPTION_REQUIRED", status: 403 };
    }

    let currentCount = user?.daily_download_count || 0;
    const lastReset = user?.last_download_reset;

    if (lastReset !== todayUtcString) {
        currentCount = 0;
    }

    if (currentCount >= limit && !isMaster) {
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

    return { allowed: true, remaining: isMaster ? 9999 : (limit - newCount) };
}

async function handlePoolFilters(request, env) {
  try {
    const db = env.DB;
    
    // Get distinct hub and genre combinations to build hierarchy
    const filtersRaw = await db.prepare(
      "SELECT DISTINCT collection_hub, genre FROM tracks WHERE collection_hub IS NOT NULL AND collection_hub != '' AND genre IS NOT NULL AND genre != '' ORDER BY collection_hub ASC, genre ASC"
    ).all();

    const hubsMap = {};
    filtersRaw.results.forEach(row => {
        if (!hubsMap[row.collection_hub]) hubsMap[row.collection_hub] = [];
        hubsMap[row.collection_hub].push(row.genre);
    });
    
    const hubsWithGenres = Object.entries(hubsMap).map(([hub, genres]) => ({ hub, genres }));
    
    // Get unique years
    const yearsResult = await db.prepare(
      "SELECT DISTINCT release_year FROM tracks WHERE release_year > 0 ORDER BY release_year DESC"
    ).all();

    return new Response(JSON.stringify({
      hubsWithGenres,
      years: yearsResult.results.map(r => r.release_year)
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

async function handleGetPoolTracks(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    const user = await getAuthorizedUser(request, env);

    // 1. Determine User Role for specific limits later
    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
    const now = new Date().getTime();
    const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
    const isSubscribed = (user?.is_subscriber === 1 && expiry > now);

    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const hub = url.searchParams.get("hub");
    const genre = url.searchParams.get("genre");
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");
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
    if (month && month !== 'All Months') {
        conditions.push("LOWER(t.release_month) = LOWER(?)");
        params.push(month);
    }
    if (search) {
        conditions.push("(t.title LIKE ? OR t.artist LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    // Get total counts first for pagination metadata
    const countQuery = `SELECT count(DISTINCT t.id) as total FROM tracks t ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...params).first();
    const totalRecords = countResult?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const offset = (page - 1) * limit;

    const query = `
        SELECT 
            t.*,
            t.file_url as previewUrl,
            json_group_array(
                CASE WHEN v.id IS NOT NULL THEN
                    json_object(
                        'id', v.id,
                        'version_name', v.version_name,
                        'preview_url', v.file_url,
                        'download_url', v.download_url,
                        'is_main_version', v.is_main_version
                    )
                ELSE NULL END
            ) as versions_json
        FROM tracks t
        LEFT JOIN track_versions v ON t.id = v.track_id
        ${whereClause}
        GROUP BY t.id 
        ORDER BY t.release_year DESC, t.created_at DESC 
        LIMIT ? OFFSET ?
    `;

    const pagedParams = [...params, limit, offset];
    const { results } = await env.DB.prepare(query).bind(...pagedParams).all();

    // Calculate daily limits
    const createdDate = new Date(user?.created_at || now);
    const daysSinceCreated = Math.floor((now - createdDate.getTime()) / (1000 * 3600 * 24));
    
    let dailyLimit = 0;
    const userPlan = user?.subscription_plan?.toLowerCase() || 'none';

    if (isMaster) {
        dailyLimit = 9999;
    } else if (isSubscribed) {
        if (userPlan === 'trial') {
            dailyLimit = 10;
        } else if (userPlan === 'monthly') {
            dailyLimit = 30;
        } else {
            dailyLimit = 200;
        }
    } else {
        // Free/Trial: 10 downloads/day for 1 week
        if (daysSinceCreated <= 7) {
            dailyLimit = 10;
        } else {
            dailyLimit = 0;
        }
    }

    const responsePayload = {
        tracks: results.map(r => {
            let parsedVersions = [];
            if (r.versions_json && r.versions_json !== '[null]' && r.versions_json !== '[]') {
                try {
                    parsedVersions = JSON.parse(r.versions_json).filter(Boolean);
                } catch (e) { }
            }
            delete r.versions_json;
            
            // Apply name replacement
            const artist = sanitizeName(r.artist);
            const title = sanitizeName(r.title);

            return {
                ...r,
                artist,
                title,
                versions: parsedVersions
            };
        }),
        pagination: {
            page,
            limit,
            totalRecords,
            totalPages
        },
        isAuthorized: true,
        downloadLimit: dailyLimit,
        downloadsCount: user?.daily_download_count || 0
    };

    return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handlePoolDownload(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    const token = url.searchParams.get("token");
    const versionId = url.searchParams.get("versionId");
    const filename = url.searchParams.get("filename") || "track.mp3";

    if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Build a fake request with the token in the Authorization header
    // so we can reuse getAuthorizedUser without duplication.
    let user = null;
    try {
        const fakeReq = new Request(request.url, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        user = await getAuthorizedUser(fakeReq, env);
    } catch (e) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
    const now = new Date().getTime();
    const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
    const isSubscribed = isMaster || (user?.is_subscriber === 1 && expiry > now);

    if (!isSubscribed) {
        return new Response(JSON.stringify({ error: "SUBSCRIPTION_REQUIRED" }), { status: 403, headers: corsHeaders });
    }

    // Enforce and increment daily limit
    const check = await checkAndIncrementDownloads(user, env, isAdminEmail);
    if (!check.allowed) {
        return new Response(JSON.stringify({ error: check.error }), { status: check.status, headers: corsHeaders });
    }

    if (!versionId) {
        return new Response(JSON.stringify({ error: "versionId required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch the download URL from D1
    const version = await env.DB.prepare(
        `SELECT download_url, file_url FROM track_versions WHERE id = ?`
    ).bind(versionId).first();

    if (!version || (!version.download_url && !version.file_url)) {
        return new Response(JSON.stringify({ error: "Track version not found" }), { status: 404, headers: corsHeaders });
    }

    const fileUrl = version.download_url || version.file_url;

    // Proxy the file and force a download dialog in the browser
    const fileResponse = await fetch(fileUrl, {
        headers: request.headers
    });

    const responseHeaders = new Headers(fileResponse.headers);
    responseHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    responseHeaders.set("Access-Control-Allow-Origin", "*"); // Allow CORS for download
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Disposition"); // Expose header for client

    return new Response(fileResponse.body, {
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        headers: responseHeaders,
    });
}

export async function handleStorefrontPool(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        if (method === "GET" && path === "/api/pool/filters") {
            return handlePoolFilters(request, env);
        }

        if (method === "GET" && path === "/api/pool/tracks") {
            const user = await getAuthorizedUser(request, env);

            // 1. Determine User Role for specific limits later
            const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
            const now = new Date().getTime();
            const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
            const isSubscribed = (user?.is_subscriber === 1 && expiry > now);

            const page = parseInt(url.searchParams.get("page")) || 1;
            const limit = parseInt(url.searchParams.get("limit")) || 50;
            const hub = url.searchParams.get("hub");
            const genre = url.searchParams.get("genre");
            const year = url.searchParams.get("year");
            const month = url.searchParams.get("month");
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
            if (month && month !== 'All Months') {
                conditions.push("LOWER(t.release_month) = LOWER(?)");
                params.push(month);
            }
            if (search) {
                conditions.push("(t.title LIKE ? OR t.artist LIKE ?)");
                params.push(`%${search}%`, `%${search}%`);
            }

            const whereClause = "WHERE " + conditions.join(" AND ");

            // Get total counts first for pagination metadata
            const countQuery = `SELECT count(DISTINCT t.id) as total FROM tracks t ${whereClause}`;
            const countResult = await env.DB.prepare(countQuery).bind(...params).first();
            const totalRecords = countResult?.total || 0;
            const totalPages = Math.ceil(totalRecords / limit);

            const offset = (page - 1) * limit;

            const query = `
                SELECT 
                    t.*,
                    t.file_url as previewUrl,
                    json_group_array(
                        CASE WHEN v.id IS NOT NULL THEN
                            json_object(
                                'id', v.id,
                                'version_name', v.version_name,
                                'preview_url', v.file_url,
                                'download_url', v.download_url,
                                'is_main_version', v.is_main_version
                            )
                        ELSE NULL END
                    ) as versions_json
                FROM tracks t
                LEFT JOIN track_versions v ON t.id = v.track_id
                ${whereClause}
                GROUP BY t.id 
                ORDER BY t.release_year DESC, t.created_at DESC 
                LIMIT ? OFFSET ?
            `;

            const pagedParams = [...params, limit, offset];
            const { results } = await env.DB.prepare(query).bind(...pagedParams).all();

            // Calculate daily limits
            const createdDate = new Date(user?.created_at || now);
            const daysSinceCreated = Math.floor((now - createdDate.getTime()) / (1000 * 3600 * 24));
            
            let dailyLimit = 0;
            const userPlan = user?.subscription_plan?.toLowerCase() || 'none';

            if (isMaster) {
                dailyLimit = 9999;
            } else if (isSubscribed) {
                if (userPlan === 'trial') {
                    dailyLimit = 10;
                } else if (userPlan === 'monthly') {
                    dailyLimit = 30;
                } else {
                    dailyLimit = 200;
                }
            } else {
                // Free/Trial: 10 downloads/day for 1 week
                if (daysSinceCreated <= 7) {
                    dailyLimit = 10;
                } else {
                    dailyLimit = 0;
                }
            }

            const responsePayload = {
                tracks: results.map(r => {
                    let parsedVersions = [];
                    if (r.versions_json && r.versions_json !== '[null]' && r.versions_json !== '[]') {
                        try {
                            parsedVersions = JSON.parse(r.versions_json).filter(Boolean);
                        } catch (e) { }
                    }
                    delete r.versions_json;

                    // Apply name replacement
                    const artist = sanitizeName(r.artist);
                    const title = sanitizeName(r.title);

                    return {
                        ...r,
                        artist,
                        title,
                        versions: parsedVersions
                    };
                }),
                pagination: {
                    page,
                    limit,
                    totalRecords,
                    totalPages
                },
                isAuthorized: true,
                downloadLimit: dailyLimit,
                downloadsCount: user?.daily_download_count || 0
            };

            return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // ----------------------------------------------------------------
        // GET /api/pool/download  — proxy the file for browser download
        // The frontend uses window.location.href with ?token=... because
        // browser navigations cannot set custom Authorization headers.
        // ----------------------------------------------------------------
        if (method === "GET" && path === "/api/pool/download") {
            const token = url.searchParams.get("token");
            const versionId = url.searchParams.get("versionId");
            const filename = url.searchParams.get("filename") || "track.mp3";

            if (!token) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
            }

            // Build a fake request with the token in the Authorization header
            // so we can reuse getAuthorizedUser without duplication.
            let user = null;
            try {
                const fakeReq = new Request(request.url, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                user = await getAuthorizedUser(fakeReq, env);
            } catch (e) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
            }

            if (!user) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
            }

            const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
            const now = new Date().getTime();
            const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
            const isSubscribed = isMaster || (user?.is_subscriber === 1 && expiry > now);

            if (!isSubscribed) {
                return new Response(JSON.stringify({ error: "SUBSCRIPTION_REQUIRED" }), { status: 403, headers: corsHeaders });
            }

            // Enforce and increment daily limit
            const check = await checkAndIncrementDownloads(user, env, isAdminEmail);
            if (!check.allowed) {
                return new Response(JSON.stringify({ error: check.error }), { status: check.status, headers: corsHeaders });
            }

            if (!versionId) {
                return new Response(JSON.stringify({ error: "versionId required" }), { status: 400, headers: corsHeaders });
            }

            // Fetch the download URL from D1
            const version = await env.DB.prepare(
                `SELECT download_url, file_url FROM track_versions WHERE id = ?`
            ).bind(versionId).first();

            if (!version || (!version.download_url && !version.file_url)) {
                return new Response(JSON.stringify({ error: "Track version not found" }), { status: 404, headers: corsHeaders });
            }

            const fileUrl = version.download_url || version.file_url;

            // Proxy the file and force a download dialog in the browser
            const fileResponse = await fetch(fileUrl, {
                headers: {
                    "User-Agent": "DJFlowerz-Worker/1.0",
                    "Referer": "https://djflowerz.co.ke",
                }
            });

            if (!fileResponse.ok) {
                return new Response(JSON.stringify({ error: "File not available at source", status: fileResponse.status }), {
                    status: 502,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            const contentType = fileResponse.headers.get("Content-Type") || "application/octet-stream";
            // Sanitise filename so it's safe for the header value
            const safeFilename = filename.replace(/[^\w.\- ()]/g, '_');

            return new Response(fileResponse.body, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": contentType,
                    "Content-Disposition": `attachment; filename="${safeFilename}"`,
                    "Cache-Control": "no-store",
                }
            });
        }

        if (method === "POST" && path === "/api/pool/download") {
            const user = await getAuthorizedUser(request, env);
            if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

            const body = await request.json();
            const { url: downloadUrl } = body;
            
            if (!downloadUrl) {
                return new Response(JSON.stringify({ error: "Missing download URL" }), { status: 400, headers: corsHeaders });
            }

            const check = await checkAndIncrementDownloads(user, env, isAdminEmail);
            if (!check.allowed) {
                return new Response(JSON.stringify({ error: check.error }), { status: check.status, headers: corsHeaders });
            }

            return new Response(JSON.stringify({ redirectUrl: downloadUrl, remaining: check.remaining, success: true }), { 
                headers: { 
                    ...corsHeaders, 
                    "Content-Type": "application/json",
                    "X-Downloads-Remaining": check.remaining.toString()
                } 
            });
        }

    } catch (e) {
        console.error("[Pool API Error]", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
}

export async function handleGetSyncNotifications(request, env) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    try {
        const { results } = await env.DB.prepare(`
            SELECT * FROM sync_notifications 
            ORDER BY created_at DESC 
            LIMIT 10
        `).all();

        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}
