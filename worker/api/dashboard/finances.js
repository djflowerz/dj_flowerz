// worker/api/dashboard/finances.js
// [VERIFIED] Financial reporting and stats for admin dashboard.
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
            // GET /api/admin/dashboard - Unified Dashboard Stats
            if (url.pathname.endsWith('/dashboard')) {
                // 1. Revenue Stats
                const statsRow = await env.DB.prepare(`
                    SELECT 
                        CAST(COALESCE((SELECT SUM(amount_kes) FROM payments WHERE status = 'success'), 0) + 
                             COALESCE((SELECT SUM(total_amount) FROM orders WHERE payment_status = 'paid'), 0) AS REAL) as total,
                        CAST(COALESCE((SELECT SUM(amount_kes) FROM payments WHERE status = 'success'), 0) AS REAL) as confirmed
                `).first();

                // 2. Counts
                const ordersCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM orders`).first();
                const mixtapesCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM mixtapes`).first();
                const subscribersCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM profiles WHERE is_subscriber = 1`).first();
                const totalUsersCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM profiles`).first();
                const tipsCount = await env.DB.prepare(`SELECT CAST(COALESCE(SUM(amount), 0) AS REAL) as total FROM tips`).first();

                console.log('[Dashboard Stats] Data Sync Check:', {
                    revenue: statsRow,
                    users: totalUsersCount?.count,
                    subscribers: subscribersCount?.count,
                    time: new Date().toISOString()
                });

                // 3. Recent Activity (Orders + Payments)
                const { results: recentOrders } = await env.DB.prepare(
                    `SELECT id, customer_email, customer_name, total_amount as amount, payment_status as status, created_at, 'order' as type 
                     FROM orders ORDER BY created_at DESC LIMIT 5`
                ).all();

                const { results: recentPayments } = await env.DB.prepare(
                    `SELECT id, customer_email, '' as customer_name, amount_kes as amount, status, created_at, 'payment' as type 
                     FROM payments ORDER BY created_at DESC LIMIT 5`
                ).all();

                const combinedActivity = [...(recentOrders || []), ...(recentPayments || [])]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10)
                    .map(o => ({
                        id: o.id,
                        type: o.type,
                        email: o.customer_email,
                        name: o.customer_name || o.customer_email || 'Customer',
                        amount: o.amount,
                        status: o.status,
                        createdAt: o.created_at
                    }));

                return Response.json({
                    totalRevenue: statsRow?.total || 0,
                    confirmedRevenue: statsRow?.confirmed || 0,
                    totalOrders: ordersCount?.count || 0,
                    activeMixtapes: mixtapesCount?.count || 0,
                    activeUsers: subscribersCount?.count || 0,
                    totalTips: tipsCount?.total || 0,
                    totalUsers: totalUsersCount?.count || 0,
                    recentActivity: combinedActivity
                });
            }

            // GET /api/admin/stats - Unified Dashboard Totals (Legacy/Alternative)
            if (url.pathname.endsWith('/stats')) {
                const revenue = await env.DB.prepare(
                    `SELECT IFNULL(SUM(amount_kes), 0) as total_revenue 
                     FROM payments WHERE status = 'success'`
                ).first();
                
                const activeSubs = await env.DB.prepare(
                    `SELECT COUNT(*) as active_subs 
                     FROM profiles WHERE is_subscriber = 1`
                ).first();

                const recentSales = await env.DB.prepare(
                    `SELECT 
                        COUNT(*) as count,
                        IFNULL(SUM(amount_kes), 0) as amount
                     FROM payments 
                     WHERE status = 'success' 
                     AND created_at >= datetime('now', '-30 days')`
                ).first();

                return Response.json({
                    total_revenue: revenue.total_revenue,
                    active_subs: activeSubs.active_subs,
                    monthly_sales_count: recentSales.count,
                    monthly_sales_amt: recentSales.amount,
                    currency: 'KES'
                });
            }

            // GET /api/admin/payments
            if (url.pathname.endsWith('/payments')) {
                const { results } = await env.DB.prepare(
                    `SELECT id, customer_email, amount_kes, method, currency, status, created_at 
                     FROM payments 
                     ORDER BY created_at DESC LIMIT 200`
                ).all();
                return Response.json(results || []);
            }
            
            // GET /api/admin/finances/tips
            if (url.pathname.includes('/tips')) {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM tips ORDER BY created_at DESC`
                ).all();
                return Response.json(results || []);
            }
        }

        if (method === 'POST') {
            // POST /api/admin/sync-paystack
            if (url.pathname.endsWith('/sync-paystack')) {
                if (!env.PAYSTACK_SECRET_KEY) {
                    throw new Error("Missing PAYSTACK_SECRET_KEY in environment");
                }

                const psRes = await fetch(
                    "https://api.paystack.co/transaction?status=success&perPage=20",
                    { headers: { "Authorization": `Bearer ${env.PAYSTACK_SECRET_KEY}` } }
                );
                
                const responseData = await psRes.json();
                const transactions = responseData.data || [];
                let synced = 0;

                for (const tx of transactions) {
                    const ref = tx.reference;
                    const email = tx.customer?.email || "";
                    const amountKes = (tx.amount || 0) / 100;
                    const channel = tx.channel || "unknown";

                    const existing = await env.DB.prepare("SELECT id FROM payments WHERE id = ?").bind(ref).first();
                    if (!existing) {
                        // 0. Resolve User ID
                        const userProfile = await env.DB.prepare("SELECT id FROM profiles WHERE email = ?").bind(email).first();
                        const userId = userProfile ? userProfile.id : null;

                        // 1. Insert payment record
                        await env.DB.prepare(`
                            INSERT INTO payments (id, user_id, customer_email, amount_kes, method, verified_sig, status, created_at)
                            VALUES (?, ?, ?, ?, ?, 1, 'success', datetime('now'))
                            ON CONFLICT(id) DO NOTHING
                        `).bind(ref, userId, email, amountKes, channel).run();

                        // 2. Grant subscription (30 Days)
                        const expiry = new Date();
                        expiry.setDate(expiry.getDate() + 30);
                        
                        await env.DB.prepare(`
                            UPDATE profiles SET 
                                is_subscriber = 1, 
                                subscription_expiry = ?, 
                                subscription_plan = 'monthly',
                                updated_at = datetime('now')
                            WHERE email = ?
                        `).bind(expiry.toISOString(), email).run();

                        synced++;
                    }
                }

                // Log sync summary
                await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                    .bind("PAYSTACK_SYNC", `Synced ${synced} missing payments`).run();

                return Response.json({ success: true, synced });
            }

            // POST /api/admin/finances/tips
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
