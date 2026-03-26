// worker/api/dashboard/referrals.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardReferrals(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;

    // Require Admin authorization
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        if (method === 'GET') {
            if (url.pathname.includes('/stats')) {
                // Get all referral stats
                const { results } = await env.DB.prepare(`
                    SELECT s.*, u.email, u.full_name
                    FROM referral_stats s
                    JOIN users u ON s.referrer_id = u.id
                    ORDER BY s.total_referrals DESC
                `).all();
                return Response.json(results || []);
            }
            if (url.pathname.includes('/logs')) {
                // Get recent logs
                const { results } = await env.DB.prepare(`
                    SELECT l.*, u1.email as referrer_email, u2.email as referred_email
                    FROM referral_logs l
                    JOIN users u1 ON l.referrer_id = u1.id
                    JOIN users u2 ON l.referred_id = u2.id
                    ORDER BY l.created_at DESC
                    LIMIT 100
                `).all();
                return Response.json(results || []);
            }
        }

        return new Response('Not Found', { status: 404 });
    } catch (err) {
        console.error('[Referral Dashboard API Error]', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
