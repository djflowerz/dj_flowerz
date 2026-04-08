
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
        // All paid plans get unlimited downloads
        limit = 9999;
    } else {
        limit = 0; // Unsubscribed users get 0 downloads
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
    const cacheKey = "cache:pool:filters_v3";
    
    if (env.KV) {
        try {
            const cached = await env.KV.get(cacheKey, "json");
            if (cached) {
                return new Response(JSON.stringify(cached), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Cache-Control': 'public, max-age=3600'
                    }
                });
            }
        } catch (e) {
            console.error("KV read error:", e);
        }
    }

    const db = env.DB;
    
    // Get distinct hub and genre combinations to build hierarchy
    // We use COALESCE to handle nulls and ensure all active tracks are categorised
    const filtersRaw = await db.prepare(
      `SELECT DISTINCT 
         COALESCE(NULLIF(TRIM(collection_hub), ''), 'Main Pool') as collection_hub, 
         COALESCE(NULLIF(TRIM(display_genre), ''), NULLIF(TRIM(genre), ''), 'Other') as genre,
         COALESCE(NULLIF(TRIM(sub_genre), ''), '') as sub_genre
       FROM tracks
       WHERE is_active = 1
       ORDER BY collection_hub ASC, genre ASC, sub_genre ASC`
    ).all();

    const hubsMap = {};
    filtersRaw.results.forEach(row => {
        const hub = row.collection_hub || 'Main Pool';
        const genre = row.genre || 'Other';
        const subGenre = row.sub_genre || '';

        if (!hubsMap[hub]) hubsMap[hub] = {};
        if (!hubsMap[hub][genre]) hubsMap[hub][genre] = new Set();
        if (subGenre) hubsMap[hub][genre].add(subGenre);
    });

    const hubsWithGenres = Object.entries(hubsMap).map(([name, genresMap]) => ({
        name,
        genres: Object.entries(genresMap).map(([genreName, subGenresSet]) => ({
            name: genreName,
            sub_genres: Array.from(subGenresSet)
        }))
    }));
    
    // Get unique years and months
    const yearMonthResult = await db.prepare(
      "SELECT DISTINCT release_year as year, release_month as month FROM tracks WHERE release_year > 0 ORDER BY release_year DESC"
    ).all();

    const VALID_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const yearsWithMonths = {};
    yearMonthResult.results.forEach(row => {
        const y = row.year;
        const m = row.month;
        if (!yearsWithMonths[y]) yearsWithMonths[y] = new Set();
        // Only add months that are real calendar month names — filters out dirty DB values
        if (m && VALID_MONTHS.includes(m)) yearsWithMonths[y].add(m);
    });

    const yearsData = Object.entries(yearsWithMonths).map(([year, monthSet]) => ({
        year: parseInt(year),
        months: Array.from(monthSet).sort((a, b) => VALID_MONTHS.indexOf(a) - VALID_MONTHS.indexOf(b))
    })).sort((a, b) => b.year - a.year);

    const responseData = {
      hubsWithGenres,
      years: yearsData
    };

    if (env.KV) {
        try {
            await env.KV.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 3600 });
        } catch (e) {
            console.error("KV write error:", e);
        }
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Cache-Control': 'public, max-age=3600',
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
    const subGenre = url.searchParams.get("sub_genre");
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");
    const search = url.searchParams.get("search");
    const isHype = url.searchParams.get("isHype") === "true";

    let conditions = ["t.is_active = 1"];
    const params = [];

    if (isHype) {
        conditions.push("(LOWER(t.genre) LIKE '%hype%' OR LOWER(t.display_genre) LIKE '%hype%' OR LOWER(t.vibe) LIKE '%hype%' OR LOWER(t.collection_hub) LIKE '%hype%')");
    }
    
    // Hub maps to collection_hub
    if (hub && !['All Hubs', 'all', 'Select Folder', 'undefined'].includes(hub)) {
        if (hub === 'Main Pool') {
            conditions.push("(t.collection_hub = ? OR t.collection_hub IS NULL OR t.collection_hub = '')");
            params.push('Main Pool');
        } else {
            conditions.push("t.collection_hub = ?");
            params.push(hub);
        }
    }
    // Genre maps to display_genre (which is what handlePoolFilters uses)
    if (genre && !['All Genres', 'All', 'all', 'Select Subfolder', 'undefined'].includes(genre)) {
        if (genre === 'Other') {
            conditions.push("(t.display_genre = ? OR t.genre = ? OR (t.display_genre IS NULL AND t.genre IS NULL))");
            params.push('Other', 'Other');
        } else {
            conditions.push("(t.display_genre = ? OR t.genre = ?)");
            params.push(genre, genre);
        }
    }
    // Sub-genre filter
    if (subGenre && subGenre !== 'undefined' && subGenre !== 'all') {
        conditions.push("t.sub_genre = ?");
        params.push(subGenre);
    }
    // Date filtering (Year and Month)
    if (year && year !== 'All Years' && year !== 'undefined') {
        const yearInt = parseInt(year);
        if (!isNaN(yearInt)) {
            conditions.push("t.release_year = ?");
            params.push(yearInt);
        }
    }
    if (month && month !== 'All Months' && month !== 'undefined') {
        conditions.push("t.release_month = ?");
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
        // All paid plans get unlimited downloads
        dailyLimit = 9999;
    } else {
        dailyLimit = 0; // Unsubscribed users get 0 downloads
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
    const method = request.method;
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "POST") {
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

    // GET method (direct proxy for browser download)
    const token = url.searchParams.get("token");
    const versionId = url.searchParams.get("versionId");
    const filename = url.searchParams.get("filename") || "track.mp3";

    if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Build a fake request with the token in the Authorization header
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
            return handleGetPoolTracks(request, env);
        }

        if (path === "/api/pool/download") {
            return handlePoolDownload(request, env);
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
