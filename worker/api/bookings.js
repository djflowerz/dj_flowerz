// worker/api/bookings.js
import { getAuthorizedUser } from '../utils/auth.js';
import { sendEmail } from '../utils/email.js';
import { templates } from '../utils/templates.js';

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

                // 1. Send Confirmation to Client
                ctx.waitUntil(sendEmail({
                    to: client_email,
                    subject: 'Gig Inquiry Received! 🗓️',
                    html: templates.bookingConfirmation(client_name || 'Legend', event_type || 'Event', event_date, ''),
                    text: `Hello ${client_name}, we've received your gig inquiry for ${event_date}. DJ Flowerz will contact you shortly.`
                }, env));

                // 2. Send Alert to Admin
                ctx.waitUntil(sendEmail({
                    to: env.GMAIL_USER || 'admin@djflowerz.co.ke',
                    subject: '🚨 New Gig Inquiry!',
                    html: templates.adminAlert('New Gig Inquiry', [
                        ['Client', client_name],
                        ['Email', client_email],
                        ['Date', event_date],
                        ['Type', event_type || 'Gig']
                    ]),
                    text: `New Gig Inquiry from ${client_name} (${client_email}) for ${event_date}.`
                }, env));

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

                // 1. Send Confirmation to Customer
                ctx.waitUntil(sendEmail({
                    to: customer_email,
                    subject: 'Studio Booking Received! 🎙️',
                    html: templates.bookingConfirmation('Legend', 'Studio Session', session_date, start_time),
                    text: `Hello, we've received your studio booking for ${session_date} at ${start_time}.`
                }, env));

                // 2. Send Alert to Admin
                ctx.waitUntil(sendEmail({
                    to: env.GMAIL_USER || 'admin@djflowerz.co.ke',
                    subject: '🚨 New Studio Booking!',
                    html: templates.adminAlert('New Studio Booking', [
                        ['Customer', customer_email],
                        ['Date', session_date],
                        ['Time', start_time],
                        ['Price', `KES ${total_price_kes}`]
                    ]),
                    text: `New Studio Booking from ${customer_email} for ${session_date} at ${start_time}.`
                }, env));

                return Response.json({ success: true, id });
            }
        } catch (err) {
            console.error('[Bookings POST Error]', err);
            return Response.json({ error: err.message }, { status: 500 });
        }
    }

    // ADMIN ONLY: Operations
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

            if (url.pathname.includes('/blackout')) {
                const { results } = await env.DB.prepare(`SELECT * FROM booking_blackouts ORDER BY date ASC`).all();
                return Response.json(results || []);
            }
        }

        if (method === 'POST') {
            const body = await request.json();

            if (url.pathname.includes('/blackout')) {
                const { date, reason } = body;
                if (!date) return Response.json({ error: 'Date is required' }, { status: 400 });
                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO booking_blackouts (id, date, reason, created_at)
                    VALUES (?, ?, ?, ?)
                `).bind(id, date, reason || 'Gig Confirmed', new Date().toISOString()).run();
                return Response.json({ success: true, id });
            }

            const id = body.id || crypto.randomUUID();

            if (url.pathname.includes('/gig')) {
                const { client_name, client_email, event_date, event_type, location_details, requirements, status, quote_amount, deposit_received } = body;
                await env.DB.prepare(`
                    INSERT INTO event_gigs (id, client_name, client_email, event_date, event_type, location_details, requirements, status, quote_amount, deposit_received)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(id, client_name, client_email, event_date, event_type, location_details, requirements, status || 'confirmed', quote_amount || 0, deposit_received || 0).run();
                return Response.json({ success: true, id });
            }

            if (url.pathname.includes('/studio')) {
                const { customer_email, session_date, start_time, duration_hours, extras, total_price_kes, status } = body;
                await env.DB.prepare(`
                    INSERT INTO studio_sessions (id, customer_email, session_date, start_time, duration_hours, extras, total_price_kes, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(id, customer_email, session_date, start_time, duration_hours || 1, JSON.stringify(extras || []), total_price_kes || 0, status || 'confirmed').run();
                return Response.json({ success: true, id });
            }
        }

        if (method === 'PATCH' || method === 'PUT') {
            const body = await request.json();
            const id = url.pathname.split('/').pop();

            if (url.pathname.includes('/gig/')) {
                const { status, quote_amount, deposit_received, client_name, client_email, event_date, event_type } = body;
                await env.DB.prepare(`
                    UPDATE event_gigs 
                    SET status = COALESCE(?, status), 
                        quote_amount = COALESCE(?, quote_amount), 
                        deposit_received = COALESCE(?, deposit_received),
                        client_name = COALESCE(?, client_name),
                        client_email = COALESCE(?, client_email),
                        event_date = COALESCE(?, event_date),
                        event_type = COALESCE(?, event_type)
                    WHERE id = ?
                `).bind(status || null, quote_amount || null, deposit_received || null, client_name || null, client_email || null, event_date || null, event_type || null, id).run();
                return Response.json({ success: true });
            }

            if (url.pathname.includes('/studio/')) {
                const { status, total_price_kes, duration_hours, session_date, start_time } = body;
                await env.DB.prepare(`
                    UPDATE studio_sessions 
                    SET status = COALESCE(?, status),
                        total_price_kes = COALESCE(?, total_price_kes),
                        duration_hours = COALESCE(?, duration_hours),
                        session_date = COALESCE(?, session_date),
                        start_time = COALESCE(?, start_time)
                    WHERE id = ?
                `).bind(status || null, total_price_kes || null, duration_hours || null, session_date || null, start_time || null, id).run();
                return Response.json({ success: true });
            }
        }

        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            if (url.pathname.includes('/blackout/')) {
                await env.DB.prepare(`DELETE FROM booking_blackouts WHERE id = ?`).bind(id).run();
                return Response.json({ success: true });
            }
        }

        return Response.json({ error: 'Not Found' }, { status: 404 });
    } catch (err) {
        console.error('[Bookings API Error]', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
