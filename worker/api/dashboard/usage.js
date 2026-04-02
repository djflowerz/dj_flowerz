// worker/api/dashboard/usage.js

export async function handleDashboardUsage(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // Verify admin authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // GET /api/admin/usage - Monitoring real-time pool activity
        if (method === 'GET' && url.pathname === '/api/admin/usage') {
            const { results } = await env.DB.prepare(`
                SELECT 
                    email, 
                    full_name, 
                    subscription_plan as current_plan, 
                    daily_download_count as downloads_today, 
                    updated_at as last_download_at, 
                    subscription_expiry as subscription_end_date, 
                    is_subscriber
                FROM profiles
                WHERE daily_download_count > 0 OR is_subscriber = 1
                ORDER BY daily_download_count DESC
                LIMIT 100
            `).all();

            return Response.json(results || []);
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

    } catch (err) {
        console.error('[Usage Handler Error]', err);
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
