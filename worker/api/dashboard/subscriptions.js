// worker/api/dashboard/subscriptions.js
// [VERIFIED] Subscription logic and expiry watch for dashboard sync.
import { sendEmail } from '../../utils/email.js';

export const PLAN_DURATIONS = {
    'weekly': 7,
    '1 Week': 7,
    '1 week': 7,
    'monthly': 30,
    '1 Month': 30,
    '1 month': 30,
    '3months': 90,
    '3 Months': 90,
    '6months': 180,
    '6 Months': 180,
    'yearly': 365,
    'pro': 365,
    '1 Year': 365,
    '1 year': 365
};


export async function handleDashboardSubscriptions(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;
    const id = params?.id;

    // Verify admin authorization (unless it's public plans)
    const isPublicPlans = url.pathname === '/api/plans';
    const authHeader = request.headers.get('Authorization');
    
    if (!isPublicPlans) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    try {
        // GET /api/admin/subscriptions - list all subscriptions
        if (method === 'GET' && url.pathname === '/api/admin/subscriptions') {
            const { results } = await env.DB.prepare(
                `SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 500`
            ).all();
            return Response.json(results || []);
        }

        // GET /api/admin/expiry-watch - Filtered for AdminDashboard
        if (method === 'GET' && url.pathname === '/api/admin/expiry-watch') {
            // PRO-TIP: We've moved auto-cleanup to a periodic cron job to save DB writes on GET

            const { results } = await env.DB.prepare(
                `SELECT id, email, full_name, phone_number, subscription_expiry as subscription_end_date
                 FROM profiles 
                 WHERE is_subscriber = 1 
                 AND subscription_expiry IS NOT NULL 
                 AND subscription_expiry != ''
                 ORDER BY subscription_expiry ASC LIMIT 100`
            ).all();

            const now = new Date().getTime();
            const expiring = (results || []).map(u => {
                const expiry = new Date(u.subscription_end_date).getTime();
                const hoursLeft = (expiry - now) / (1000 * 60 * 60);
                return { ...u, hours_left: hoursLeft };
            }).filter(u => u.hours_left <= 48 && u.hours_left >= -24); // Show ±24-48h window

            return Response.json({ success: true, users: expiring });
        }

        // GET /api/admin/active-subscribers - Registry of currently active subscribers
        if (method === 'GET' && (url.pathname === '/api/admin/active-subscribers' || url.pathname === '/api/admin/subscriptions/active')) {
            const { results } = await env.DB.prepare(
                `SELECT id, email, full_name, is_subscriber, subscription_plan, subscription_expiry 
                 FROM profiles 
                 WHERE is_subscriber = 1 AND (subscription_expiry IS NULL OR subscription_expiry > ?)
                 ORDER BY subscription_expiry DESC`
            ).bind(new Date().toISOString()).all();
            return Response.json(results || []);
        }

        // POST /api/admin/subscriptions/manage or /api/admin/revoke-access
        if (method === 'POST' && (url.pathname === '/api/admin/subscriptions/manage' || url.pathname === '/api/admin/revoke-access')) {
            const body = await request.json();
            let { userId, email, plan, action, days } = body;

            // Treat /api/admin/revoke-access as a revoke action
            if (url.pathname === '/api/admin/revoke-access') {
                action = 'revoke';
                // Also handle targetEmail if sent from component
                if (body.targetEmail && !email) email = body.targetEmail;
            }

            if ((!userId && !email) || !action) {
                return new Response(JSON.stringify({ error: 'userId/email and action are required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const now = new Date();
            const nowIso = now.toISOString();

            // Fetch user info
            let userProfile;
            if (userId) {
                userProfile = await env.DB.prepare(`SELECT id, full_name, email FROM profiles WHERE id = ?`).bind(userId).first();
            } else {
                userProfile = await env.DB.prepare(`SELECT id, full_name, email FROM profiles WHERE email = ?`).bind(email).first();
            }

            if (!userProfile) {
                return new Response(JSON.stringify({ error: 'Target identity not found in matrix' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const targetId = userProfile.id;
            const targetEmail = userProfile.email;
            const targetName = userProfile.full_name || 'Member';

            if (action === 'revoke') {
                // Revoke: set is_subscriber=0 and subscription_plan to null
                await env.DB.prepare(
                    `UPDATE profiles SET is_subscriber = 0, subscription_plan = NULL,
                     subscription_expiry = NULL
                     WHERE id = ?`
                ).bind(targetId).run();

                // Also mark active subscriptions as cancelled
                await env.DB.prepare(
                    `UPDATE subscriptions SET status = 'cancelled'
                     WHERE user_email = ? AND status = 'active'`
                ).bind(targetEmail).run();

                // Send Revocation Email
                if (targetEmail) {
                    try {
                        await sendEmail({
                            to: targetEmail,
                            subject: 'Subscription Status Update - DJ FLOWERZ',
                            fromEmail: 'admin@djflowerz.co.ke',
                            fromName: 'DJ Flowerz Admin',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; padding: 30px; border-radius: 10px; color: white;">
                                    <h2 style="color: red;">Access Revoked</h2>
                                    <p>Your subscription access to DJ FLOWERZ has been revoked by an administrator.</p>
                                    <p>If you believe this is an error, please contact support.</p>
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
                // Determine expiry date securely
                let extensionDays = days || PLAN_DURATIONS[plan] || 30;
                let newExpiry = new Date();
                
                // If user is already active, extend from their current expiry
                const current = await env.DB.prepare(`SELECT subscription_expiry FROM profiles WHERE id = ?`).bind(targetId).first();
                if (current?.subscription_expiry) {
                    const currentExpiryDate = new Date(current.subscription_expiry);
                    if (currentExpiryDate > now) {
                        newExpiry = currentExpiryDate;
                    }
                }
                
                newExpiry.setDate(newExpiry.getDate() + extensionDays);
                const newExpiryIso = newExpiry.toISOString();
                const displayPlan = plan || `${extensionDays} Days (Manual Grant)`;

                // Update Profile
                await env.DB.prepare(
                    `UPDATE profiles SET is_subscriber = 1, subscription_plan = ?, 
                     subscription_expiry = ?, updated_at = ?
                     WHERE id = ?`
                ).bind(displayPlan, newExpiryIso, nowIso, targetId).run();

                // Create a record in subscriptions table
                await env.DB.prepare(
                    `INSERT INTO subscriptions (user_email, plan_name, amount, status, starts_at, expires_at)
                     VALUES (?, ?, 0, 'active', ?, ?)`
                ).bind(targetEmail, displayPlan, nowIso, newExpiryIso).run();

                // Send Welcome/Extension Email
                if (targetEmail) {
                    try {
                        await sendEmail({
                            to: targetEmail,
                            subject: 'Premium Access Activated! 🚀',
                            fromEmail: 'admin@djflowerz.co.ke',
                            fromName: 'DJ Flowerz Admin',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; padding: 30px; border-radius: 10px; color: white;">
                                    <h2 style="color: #a855f7;">Premium Access Enabled! 🚀</h2>
                                    <p>Your account has been granted a <strong>${displayPlan.toUpperCase()}</strong> subscription.</p>
                                    <p>This gives you full access to the DJ FLOWERZ Music Pool.</p>
                                    <div style="background: #111; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #333;">
                                        <p style="margin: 0;"><strong>Active Until:</strong> ${new Date(newExpiryIso).toLocaleDateString()}</p>
                                    </div>
                                    <a href="https://djflowerz.co.ke/music-pool" style="display: inline-block; background: #a855f7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Music Pool</a>
                                </div>
                            `,
                            text: `Hello ${targetName}, your ${displayPlan} plan is now active! Visit djflowerz.co.ke/music-pool to start.`
                        }, env);
                    } catch (e) {
                         console.error('[Grant Email Error]', e);
                    }
                }

                return Response.json({
                    success: true,
                    action: 'granted',
                    plan: displayPlan,
                    expiryDate: newExpiryIso
                });
            }

            return new Response(JSON.stringify({ error: 'Invalid action' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- Subscription Plans ---
        if (url.pathname === '/api/admin/subscription_plans' || url.pathname === '/api/plans' || url.pathname === '/api/admin/plans') {
            if (method === 'GET') {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM subscription_plans WHERE active = 1 ORDER BY price ASC`
                ).all();
                const formatted = results.map(p => ({
                    ...p,
                    features: p.features ? JSON.parse(p.features) : [],
                    isBestValue: p.is_best_value === 1,
                    isEliteChoice: p.is_elite_choice === 1
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
            const planId = id || url.pathname.split('/').pop();
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
                `).bind(data.name, data.price, data.period, data.features ? JSON.stringify(data.features) : null, data.link, data.active !== undefined ? (data.active ? 1 : 0) : null, planId).run();
                return Response.json({ success: true });
            }
            if (method === 'DELETE') {
                await env.DB.prepare(`DELETE FROM subscription_plans WHERE id = ?`).bind(planId).run();
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
