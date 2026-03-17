// worker/api/bookings.js
import { getAuthorizedUser } from '../utils/auth.js';

export async function handleBookings(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;

    // PUBLIC: Submit a gig inquiry or studio booking
    if (method === 'POST') {
        try {
            const body = await request.json();
            const id = crypto.randomUUID();

            if (url.pathname.includes('/gig')) {
                const { client_name, client_email, event_date, event_type, location_details, requirements } = body;
                
                if (!client_email || !event_date) {
                    return Response.json({ error: 'Missing required fields' }, { status: 400 });
                }

                await env.DB.prepare(`
                    INSERT INTO event_gigs (id, client_name, client_email, event_date, event_type, location_details, requirements, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(id, client_name, client_email, event_date, event_type, location_details, requirements, 'inquiry').run();

                return Response.json({ success: true, id });
            }

            if (url.pathname.includes('/studio')) {
                const { customer_email, session_date, start_time, duration_hours, extras, total_price_kes } = body;

                if (!customer_email || !session_date || !start_time) {
                    return Response.json({ error: 'Missing required fields' }, { status: 400 });
                }

                await env.DB.prepare(`
                    INSERT INTO studio_sessions (id, customer_email, session_date, start_time, duration_hours, extras, total_price_kes, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(id, customer_email, session_date, start_time, duration_hours || 1, JSON.stringify(extras || []), total_price_kes || 0, 'pending').run();

                return Response.json({ success: true, id });
            }
        } catch (err) {
            console.error('[Bookings POST Error]', err);
            return Response.json({ error: err.message }, { status: 500 });
        }
    }

    // ADMIN ONLY: Fetch bookings
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (method === 'GET') {
            if (url.pathname.includes('/gigs')) {
                const { results } = await env.DB.prepare(`SELECT * FROM event_gigs ORDER BY event_date DESC`).all();
                return Response.json(results || []);
            }

            if (url.pathname.includes('/studio')) {
                const { results } = await env.DB.prepare(`SELECT * FROM studio_sessions ORDER BY session_date DESC, start_time DESC`).all();
                return Response.json(results || []);
            }
        }

        if (method === 'PATCH') {
            const body = await request.json();
            const id = url.pathname.split('/').pop();

            if (url.pathname.includes('/gig/')) {
                const { status, quote_amount, deposit_received } = body;
                await env.DB.prepare(`
                    UPDATE event_gigs SET status = ?, quote_amount = ?, deposit_received = ? WHERE id = ?
                `).bind(status, quote_amount, deposit_received, id).run();
                return Response.json({ success: true });
            }

            if (url.pathname.includes('/studio/')) {
                const { status } = body;
                await env.DB.prepare(`
                    UPDATE studio_sessions SET status = ? WHERE id = ?
                `).bind(status, id).run();
                return Response.json({ success: true });
            }
        }

        return Response.json({ error: 'Not Found' }, { status: 404 });
    } catch (err) {
        console.error('[Bookings API Error]', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
