// worker/api/dashboard/newsletter.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardNewsletter(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;

    // Public endpoint for subscription - NO AUTH REQUIRED
    if (method === 'POST' && url.pathname === '/api/newsletter/subscribe') {
        try {
            const { email } = await request.json();
            if (!email || !email.includes('@')) {
                return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
            }

            // Check if already exists
            const existing = await env.DB.prepare(`SELECT id FROM newsletter_subscribers WHERE email = ?`).bind(email).first();
            if (existing) {
                return Response.json({ success: true, message: 'Already subscribed' });
            }

            await env.DB.prepare(`INSERT INTO newsletter_subscribers (email) VALUES (?)`).bind(email).run();
            return Response.json({ success: true });
        } catch (err) {
            console.error('[Newsletter Subscribe Error]', err);
            return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
    }

    // All other endpoints require Admin authorization
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        if (method === 'GET') {
            if (url.pathname.includes('/subscribers')) {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC`
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
