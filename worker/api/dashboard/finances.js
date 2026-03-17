// worker/api/dashboard/finances.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardFinances(request, env) {
    const method = request.method;
    const url = new URL(request.url);

    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        if (method === 'GET') {
            if (url.pathname.includes('/tips')) {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM tips ORDER BY created_at DESC`
                ).all();
                return Response.json(results || []);
            }
        }

        if (method === 'POST') {
            const body = await request.json();
            if (url.pathname.includes('/tips')) {
                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO tips (id, amount, currency, message, donor_name, donor_email, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id, 
                    body.amount, 
                    body.currency || 'KES', 
                    body.message, 
                    body.donor_name, 
                    body.donor_email, 
                    body.status || 'completed'
                ).run();
                return Response.json({ success: true, id });
            }
        }

        return new Response('Not Found', { status: 404 });
    } catch (err) {
        console.error('[Finances API Error]', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
