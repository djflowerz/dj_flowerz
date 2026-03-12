// worker/api/dashboard/newsletter.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardNewsletter(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const url = new URL(request.url);
    const method = request.method;

    try {
        if (method === 'GET') {
            if (url.pathname.includes('/subscribers')) {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM newsletter_subscribers ORDER BY date_subscribed DESC`
                ).all();
                return Response.json(results || []);
            }
            if (url.pathname.includes('/campaigns')) {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM newsletter_campaigns ORDER BY created_at DESC`
                ).all();
                return Response.json(results || []);
            }
        }

        if (method === 'DELETE' && url.pathname.includes('/subscribers/')) {
            const id = url.pathname.split('/').pop();
            await env.DB.prepare(`DELETE FROM newsletter_subscribers WHERE id = ?`).bind(id).run();
            return Response.json({ success: true });
        }

        return new Response('Not Found', { status: 404 });
    } catch (err) {
        console.error('[Newsletter API Error]', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
