import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';

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
                conditions.push("(t.release_year = ? OR t.year = ?)");
                params.push(year.toString(), year.toString());
            }
            if (month && month !== 'All Months') {
                conditions.push("(LOWER(t.release_month) = LOWER(?) OR LOWER(t.month) = LOWER(?))");
                params.push(month, month);
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
                    t.audio_url as previewUrl,
                    json_group_array(
                        CASE WHEN v.id IS NOT NULL THEN
                            json_object(
                                'id', v.id,
                                'type', v.version_name,
                                'previewUrl', v.file_url,
                                'downloadUrl', v.download_url
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

            // Calculate daily limits
            const createdDate = new Date(user?.created_at || now);
            const daysSinceCreated = Math.floor((now - createdDate.getTime()) / (1000 * 3600 * 24));
            
            let dailyLimit = 0;
            const userPlan = user?.subscription_plan?.toLowerCase() || 'none';

            if (isMaster) {
                dailyLimit = 9999;
            } else if (isSubscribed) {
                if (userPlan === 'monthly') {
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
                    return {
                        ...r,
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

        if (method === "POST" && path === "/api/pool/download") {
            const user = await getAuthorizedUser(request, env);
            if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

            const body = await request.json();
            const { url: downloadUrl } = body;
            
            if (!downloadUrl) {
                return new Response(JSON.stringify({ error: "Missing download URL" }), { status: 400, headers: corsHeaders });
            }

            const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
            const now = new Date();
            const nowMs = now.getTime();
            const todayUtcString = now.toISOString().split('T')[0];
            const createdDate = new Date(user?.created_at || now.toISOString());
            const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
            
            const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
            const isSubscribed = (user?.is_subscriber === 1 && expiry > nowMs);
            
            let limit = 0;
            const userPlan = user?.subscription_plan?.toLowerCase() || 'none';

            if (isMaster) {
                limit = 9999;
            } else if (isSubscribed) {
                if (userPlan === 'monthly') {
                    limit = 30;
                } else {
                    // "Rest of plans 200 downloads a day"
                    limit = 200;
                }
            } else {
                // Free plan: 10 downloads/day for 1 week
                if (daysSinceCreated <= 7) {
                    limit = 10;
                } else {
                    limit = 0;
                }
            }
            
            if (limit === 0) {
                 return new Response(JSON.stringify({ error: "SUBSCRIPTION_EXPIRED" }), { status: 403, headers: corsHeaders });
            }

            let currentCount = user?.daily_download_count || 0;
            const lastReset = user?.last_download_reset;

            if (lastReset !== todayUtcString) {
                currentCount = 0;
            }

            if (currentCount >= limit && !isMaster) {
                return new Response(JSON.stringify({ error: `Daily limit of ${limit} reached.` }), { status: 429, headers: corsHeaders });
            }

            // Increment count
            const newCount = currentCount + 1;
            
            try {
                 await env.DB.prepare(
                     `UPDATE profiles SET daily_download_count = ?, last_download_reset = ? WHERE id = ? OR email = ?`
                 ).bind(newCount, todayUtcString, user.id, user.email).run();
            } catch (dbErr) {
                 console.error("[Download Track] DB Update error", dbErr);
                 // We can either fail the download or allow it if DB fails. Usually better to fail safe if tracking is strictly req.
            }

            const remaining = isMaster ? 9999 : (limit - newCount);

            return new Response(JSON.stringify({ redirectUrl: downloadUrl, remaining: remaining, success: true }), { 
                headers: { 
                    ...corsHeaders, 
                    "Content-Type": "application/json",
                    "X-Downloads-Remaining": remaining.toString()
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
