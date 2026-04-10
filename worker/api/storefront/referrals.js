// worker/api/storefront/referrals.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleStorefrontReferrals(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;

    // Require authorization (user must be logged in to see their refs)
    const user = await getAuthorizedUser(request, env);
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        if (method === 'GET') {
            // Get current user's stats
            const stats = await env.DB.prepare(`
                SELECT * FROM referral_stats WHERE referrer_id = ?
            `).bind(user.id).first();

            // Get recent logs for this user
            const { results: logs } = await env.DB.prepare(`
                SELECT l.*, u.email as referred_email
                FROM referral_logs l
                JOIN profiles u ON l.referred_id = u.id
                WHERE l.referrer_id = ?
                ORDER BY l.created_at DESC
                LIMIT 50
            `).bind(user.id).all();

            return Response.json({
                stats: stats || { 
                    referrer_id: user.id, 
                    total_referrals: 0, 
                    completed_referrals: 0, 
                    total_earned_kes: 0, 
                    total_earned_days: 0 
                },
                logs: logs || []
            });
        }

        return new Response('Not Found', { status: 404 });
    } catch (err) {
        console.error('[Storefront Referral API Error]', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
