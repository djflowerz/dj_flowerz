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

            // 1. GATEKEEPER CHECK (Master/Admin Bypass)
            const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
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
                        CASE WHEN v.id IS NOT NULL THEN
                            json_object(
                                'id', v.id,
                                'type', v.version_type,
                                'previewUrl', v.preview_url,
                                'downloadUrl', v.download_url,
                                'isMainVersion', v.is_main_version
                            )
                        ELSE NULL END
                    ) as versions_json
                FROM tracks t
                LEFT JOIN track_versions v ON t.id = v.track_id
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

            query += " GROUP BY t.id ORDER BY t.created_at DESC LIMIT 15000";

            const { results } = await env.DB.prepare(query).bind(...params).all();

            // Usage limits (hardcoded limits as they were in the original file, if not present in DB)
            const DOWNLOAD_LIMITS = {
                'bedroom': 5,
                'club': 20,
                'festival': 9999,
                'none': 0
            };

            const userPlan = user?.current_plan || 'none';
            const dailyLimit = isMaster ? 9999 : (DOWNLOAD_LIMITS[userPlan] || 0);

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
                isAuthorized: true,
                downloadLimit: dailyLimit,
                downloadsCount: user?.daily_download_count || 0
            };

            return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (method === "GET" && path === "/api/pool/download") {
            const user = await getAuthorizedUser(request, env);
            if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

            const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
            const now = new Date().getTime();
            const expiry = user?.subscription_end_date ? new Date(user.subscription_end_date).getTime() : 0;
            const isSubscribed = (user?.is_subscriber === 1 && expiry > now);

            if (!isMaster && !isSubscribed) {
                return new Response(JSON.stringify({ error: "SUBSCRIPTION_EXPIRED" }), { status: 403, headers: corsHeaders });
            }

            // TODO: Implement daily download limit tracking here 
            // For now just tracking access success for frontend
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
