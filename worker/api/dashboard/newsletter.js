// worker/api/dashboard/newsletter.js
import { getAuthorizedUser } from '../../utils/auth.js';
import { sendEmail } from '../../utils/email.js';

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
            const existing = await env.DB.prepare(`SELECT email FROM subscribers WHERE email = ?`).bind(email).first();
            if (existing) {
                return Response.json({ success: true, message: 'Already subscribed' });
            }

            await env.DB.prepare(`INSERT INTO subscribers (email, status, is_active) VALUES (?, 'active', 1)`).bind(email).run();
            
            // Send Confirmation Email
            try {
                await sendEmail({
                    to: email,
                    subject: 'Welcome to DJ FLOWERZ! 🎧',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                            <h1 style="color: #a855f7; margin-bottom: 10px;">Welcome Aboard!</h1>
                            <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Thanks for joining the DJ FLOWERZ newsletter. You're now on the list for exclusive mixtapes, store drops, and music pool updates.</p>
                            <div style="background: #15151a; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #ffffff10;">
                                <p style="margin: 0; color: #ffffff;"><strong>Enjoying the vibes?</strong> Stay tuned for our next drop coming soon!</p>
                            </div>
                            <a href="https://djflowerz.co.ke" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Visit Website</a>
                            <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                            <p style="font-size: 10px; color: #4b5563; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">© 2026 DJ FLOWERZ. All rights reserved.</p>
                        </div>
                    `,
                    text: `Welcome to DJ FLOWERZ! Thanks for joining our newsletter. Visit djflowerz.co.ke for the latest mixtapes.`
                }, env);
            } catch (e) {
                console.error('[Newsletter Email Error]', e);
            }

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
        if (method === 'POST') {
            const body = await request.json();
            if (url.pathname.includes('/campaigns')) {
                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO newsletter_campaigns (id, subject, content, target_audience, status)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(id, body.subject, body.content, body.target_audience || 'all', body.status || 'draft').run();
                return Response.json({ success: true, id });
            }
            if (url.pathname.includes('/coupons')) {
                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO coupons (id, code, scope, discount_type, discount_value, min_spend, expiry_date, max_uses_total, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id, 
                    body.code.toUpperCase(), 
                    body.scope || 'all', 
                    body.discount_type, 
                    body.discount_value, 
                    body.min_spend || 0, 
                    body.expiry_date, 
                    body.max_uses_total || null, 
                    body.is_active ?? 1
                ).run();
                return Response.json({ success: true, id });
            }
        }

        if (method === 'PUT' || method === 'PATCH') {
            const body = await request.json();
            const id = url.pathname.split('/').pop();
            if (url.pathname.includes('/campaigns/')) {
                await env.DB.prepare(`
                    UPDATE newsletter_campaigns 
                    SET subject = ?, content = ?, target_audience = ?, status = ?
                    WHERE id = ?
                `).bind(body.subject, body.content, body.target_audience, body.status, id).run();
                return Response.json({ success: true });
            }
            if (url.pathname.includes('/coupons/')) {
                await env.DB.prepare(`
                    UPDATE coupons 
                    SET code = ?, scope = ?, discount_type = ?, discount_value = ?, min_spend = ?, expiry_date = ?, max_uses_total = ?, is_active = ?
                    WHERE id = ?
                `).bind(
                    body.code.toUpperCase(), 
                    body.scope, 
                    body.discount_type, 
                    body.discount_value, 
                    body.min_spend, 
                    body.expiry_date, 
                    body.max_uses_total, 
                    body.is_active, 
                    id
                ).run();
                return Response.json({ success: true });
            }
        }

        if (method === 'DELETE') {
            const id = url.pathname.split('/').pop();
            if (url.pathname.includes('/subscribers/')) {
                const emailId = decodeURIComponent(id);
                await env.DB.prepare(`DELETE FROM subscribers WHERE email = ?`).bind(emailId).run();
                return Response.json({ success: true });
            }
            if (url.pathname.includes('/campaigns/')) {
                await env.DB.prepare(`DELETE FROM newsletter_campaigns WHERE id = ?`).bind(id).run();
                return Response.json({ success: true });
            }
            if (url.pathname.includes('/coupons/')) {
                await env.DB.prepare(`DELETE FROM coupons WHERE id = ?`).bind(id).run();
                return Response.json({ success: true });
            }
        }

        if (method === 'GET') {
            if (url.pathname.includes('/subscribers')) {
                const { results } = await env.DB.prepare(
                    `SELECT email, status, is_active, created_at FROM subscribers ORDER BY created_at DESC`
                ).all();
                return Response.json(results || []);
            }
            if (url.pathname.includes('/campaigns')) {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM newsletter_campaigns ORDER BY created_at DESC`
                ).all();
                return Response.json(results || []);
            }
            if (url.pathname.includes('/coupons')) {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM coupons ORDER BY created_at DESC`
                ).all();
                return Response.json(results || []);
            }
        }

        return new Response('Not Found', { status: 404 });
    } catch (err) {
        console.error('[Newsletter API Error]', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
