// worker/api/dashboard/subscriptions.js

const PLAN_DURATIONS = {
    trial: 7,      // 7 days
    weekly: 7,
    monthly: 30,
    pro: 365
};

export async function handleDashboardSubscriptions(request, env) {
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
        // GET /api/admin/subscriptions - list all subscriptions
        if (method === 'GET' && url.pathname === '/api/admin/subscriptions') {
            const { results } = await env.DB.prepare(
                `SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 500`
            ).all();
            return Response.json(results || []);
        }

        // POST /api/admin/subscriptions/manage - grant or revoke subscription for a user
        if (method === 'POST' && url.pathname === '/api/admin/subscriptions/manage') {
            const { userId, plan, action } = await request.json();

            if (!userId || !action) {
                return new Response(JSON.stringify({ error: 'userId and action are required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const now = new Date();
            const nowIso = now.toISOString();

            if (action === 'revoke') {
                // Revoke: set is_subscriber=0 and subscription_plan to null
                await env.DB.prepare(
                    `UPDATE profiles SET is_subscriber = 0, subscription_plan = NULL,
                     subscription_end_date = NULL, updated_at = ?
                     WHERE id = ?`
                ).bind(nowIso, userId).run();

                // Also mark active subscriptions as cancelled
                await env.DB.prepare(
                    `UPDATE subscriptions SET status = 'cancelled', updated_at = ?
                     WHERE user_id = ? AND status = 'active'`
                ).bind(nowIso, userId).run();

                return Response.json({ success: true, action: 'revoked' });
            }

            if (action === 'grant') {
                if (!plan) {
                    return new Response(JSON.stringify({ error: 'plan is required for grant action' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const durationDays = PLAN_DURATIONS[plan] || 30;
                const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
                const expiryIso = expiryDate.toISOString();

                // Update the profile
                await env.DB.prepare(
                    `UPDATE profiles SET is_subscriber = 1, subscription_plan = ?,
                     subscription_end_date = ?, updated_at = ?
                     WHERE id = ?`
                ).bind(plan, expiryIso, nowIso, userId).run();

                // Create a new subscription record
                const subId = crypto.randomUUID();
                await env.DB.prepare(
                    `INSERT INTO subscriptions (id, user_id, plan, status, start_date, end_date, created_at, updated_at)
                     VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`
                ).bind(subId, userId, plan, nowIso, expiryIso, nowIso, nowIso).run();

                return Response.json({
                    success: true,
                    action: 'granted',
                    plan,
                    expiryDate: expiryIso
                });
            }

            return new Response(JSON.stringify({ error: 'Invalid action' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('[Dashboard/Subscriptions] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
