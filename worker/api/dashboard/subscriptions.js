// worker/api/dashboard/subscriptions.js
import { sendEmail } from '../../utils/email.js';

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

            // Fetch user info for email
            const userProfile = await env.DB.prepare(`SELECT full_name, email FROM profiles WHERE id = ?`).bind(userId).first();
            const targetEmail = userProfile?.email;
            const targetName = userProfile?.full_name || 'Member';

            if (action === 'revoke') {
                // Revoke: set is_subscriber=0 and subscription_plan to null
                await env.DB.prepare(
                    `UPDATE profiles SET is_subscriber = 0, subscription_plan = NULL,
                     subscription_expiry = NULL, updated_at = ?
                     WHERE id = ?`
                ).bind(nowIso, userId).run();

                // Also mark active subscriptions as cancelled
                await env.DB.prepare(
                    `UPDATE subscriptions SET status = 'cancelled', updated_at = ?
                     WHERE user_id = ? AND status = 'active'`
                ).bind(nowIso, userId).run();

                // Send Revocation Email
                if (targetEmail) {
                    try {
                        await sendEmail({
                            to: targetEmail,
                        subject: 'Subscription Status Update - DJ FLOWERZ',
                        fromEmail: 'admin@djflowerz.co.ke',
                        fromName: 'DJ Flowerz Admin',
                        html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                                    <h1 style="color: #ef4444; margin-bottom: 20px;">Subscription Revoked</h1>
                                    <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Hello ${targetName}, your premium subscription has been revoked by the administrator.</p>
                                    <p style="color: #9ca3af; font-size: 14px;">If you believe this is an error, please reach out to our support team.</p>
                                    <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                                    <p style="font-size: 10px; color: #4b5563; text-align: center;">DJ FLOWERZ OFFICIAL</p>
                                </div>
                            `,
                            text: `Hello ${targetName}, your subscription has been revoked. Contact support if you have any questions.`
                        }, env);
                    } catch (e) {
                         console.error('[Revoke Email Error]', e);
                    }
                }

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
                     subscription_expiry = ?, updated_at = ?
                     WHERE id = ?`
                ).bind(plan, expiryIso, nowIso, userId).run();

                // Create a new subscription record
                const subId = crypto.randomUUID();
                await env.DB.prepare(
                    `INSERT INTO subscriptions (id, user_id, plan, status, start_date, end_date, created_at, updated_at)
                     VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`
                ).bind(subId, userId, plan, nowIso, expiryIso, nowIso, nowIso).run();

                // Send Activation Email
                if (targetEmail) {
                    try {
                        await sendEmail({
                            to: targetEmail,
                        subject: 'Premium Access Activated! 🚀',
                        fromEmail: 'admin@djflowerz.co.ke',
                        fromName: 'DJ Flowerz Admin',
                        html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                                    <h1 style="color: #a855f7; margin-bottom: 20px;">Welcome to Premium!</h1>
                                    <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Hello ${targetName}, your <strong>${plan.toUpperCase()}</strong> plan is now active.</p>
                                    <div style="background: #15151a; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #ffffff10;">
                                        <h3 style="color: #ffffff; margin-top: 0;">Access Details</h3>
                                        <p style="margin: 5px 0; color: #9ca3af;">Plan: ${plan.toUpperCase()}</p>
                                        <p style="margin: 5px 0; color: #9ca3af;">Expiry: ${expiryDate.toLocaleDateString()}</p>
                                    </div>
                                    <p style="color: #9ca3af; font-size: 14px;">You now have full access to the Music Pool and exclusive mixtapes. Happy listening!</p>
                                    <a href="https://djflowerz.co.ke/music-pool" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">Enter Music Pool</a>
                                    <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                                    <p style="font-size: 10px; color: #4b5563; text-align: center;">DJ FLOWERZ • Nairobi, Kenya</p>
                                </div>
                            `,
                            text: `Hello ${targetName}, your ${plan} plan is now active! Visit djflowerz.co.ke/music-pool to start.`
                        }, env);
                    } catch (e) {
                         console.error('[Grant Email Error]', e);
                    }
                }

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

        // --- Subscription Plans ---
        if (url.pathname === '/api/admin/subscription_plans') {
            if (method === 'GET') {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM subscription_plans ORDER BY price ASC`
                ).all();
                const formatted = results.map(p => ({
                    ...p,
                    features: p.features ? JSON.parse(p.features) : []
                }));
                return Response.json(formatted);
            }
            if (method === 'POST') {
                const data = await request.json();
                const id = data.id || `plan_${Date.now()}`;
                await env.DB.prepare(`
                    INSERT INTO subscription_plans (id, name, price, period, features, link, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(id, data.name, data.price, data.period, JSON.stringify(data.features || []), data.link, data.active !== false ? 1 : 0).run();
                return Response.json({ success: true, id });
            }
        }

        if (url.pathname.startsWith('/api/admin/subscription_plans/')) {
            const id = url.pathname.split('/').pop();
            if (method === 'PATCH' || method === 'PUT') {
                const data = await request.json();
                await env.DB.prepare(`
                    UPDATE subscription_plans 
                    SET name = COALESCE(?, name), 
                        price = COALESCE(?, price), 
                        period = COALESCE(?, period), 
                        features = COALESCE(?, features), 
                        link = COALESCE(?, link), 
                        active = COALESCE(?, active)
                    WHERE id = ?
                `).bind(data.name, data.price, data.period, data.features ? JSON.stringify(data.features) : null, data.link, data.active !== undefined ? (data.active ? 1 : 0) : null, id).run();
                return Response.json({ success: true });
            }
            if (method === 'DELETE') {
                await env.DB.prepare(`DELETE FROM subscription_plans WHERE id = ?`).bind(id).run();
                return Response.json({ success: true });
            }
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
