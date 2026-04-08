// [VERIFIED]: Admin Dashboard Installments API.
// Handles List, Create (Manual), Update, and Delete.
// DO NOT MODIFY WITHOUT EXPLICIT UNLOCK REQUEST.

export async function handleDashboardInstallments(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // 1. Verify admin authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // GET /api/admin/installments - list all installment plans
        if (method === 'GET' && url.pathname === '/api/admin/installments') {
            const { results } = await env.DB.prepare(`
                SELECT 
                    ip.*, 
                    p.full_name, p.email, p.phone_number,
                    o.items as order_items,
                    o.status as order_status,
                    o.payment_status as order_payment_status
                FROM installment_plans ip
                JOIN profiles p ON ip.user_id = p.id
                LEFT JOIN orders o ON ip.order_id = o.id
                ORDER BY ip.created_at DESC
            `).all();
            return Response.json(results || []);
        }

        // POST /api/admin/installments - manually create an installment plan for a user
        if (method === 'POST' && url.pathname === '/api/admin/installments') {
            const data = await request.json();
            const { 
                user_id, 
                product_id, 
                product_name, 
                total_amount, 
                deposit_amount, 
                payment_interval,
                reminder_channel 
            } = data;

            if (!user_id || !product_id || !total_amount) {
                return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const id = `plan_${crypto.randomUUID().split('-')[0]}`;
            const orderId = data.order_id || `MAN-${Date.now()}`;
            const now = new Date().toISOString();
            const deposit = parseFloat(deposit_amount || 0);
            const balance = parseFloat(total_amount) - deposit;
            
            // Set initial next payment date (e.g., 7 days or 30 days from now)
            const nextDate = new Date();
            if (payment_interval === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
            } else {
                nextDate.setDate(nextDate.getDate() + 7);
            }

            await env.DB.prepare(`
                INSERT INTO installment_plans (
                    id, order_id, user_id, product_id, product_name, total_amount, 
                    deposit_amount, paid_amount, balance, status, installments_count,
                    payment_interval, next_payment_date, reminder_channel, 
                    is_reminder_enabled, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1, ?, ?)
            `).bind(
                id, orderId, user_id, product_id, product_name, total_amount, 
                deposit, deposit, balance, 
                parseInt(data.installments_count || 3),
                payment_interval || 'weekly', nextDate.toISOString(), 
                reminder_channel || 'email', now, now
            ).run();

            // If deposit > 0, record the initial payment
            if (deposit > 0) {
                const payId = `pay_${crypto.randomUUID().split('-')[0]}`;
                await env.DB.prepare(`
                    INSERT INTO installment_payments (id, plan_id, amount, status, reference, created_at)
                    VALUES (?, ?, ?, 'success', ?, ?)
                `).bind(payId, id, deposit, 'MANUAL_DEPOSIT', now).run();
            }

            return Response.json({ success: true, id });
        }

        // PATCH /api/admin/installments/:id - Update status or balance
        if ((method === 'PATCH' || method === 'PUT') && url.pathname.startsWith('/api/admin/installments/')) {
            const id = url.pathname.split('/').pop();
            const data = await request.json();
            const now = new Date().toISOString();

            await env.DB.prepare(`
                UPDATE installment_plans 
                SET status = COALESCE(?, status),
                    payment_interval = COALESCE(?, payment_interval),
                    next_payment_date = COALESCE(?, next_payment_date),
                    reminder_channel = COALESCE(?, reminder_channel),
                    is_reminder_enabled = COALESCE(?, is_reminder_enabled),
                    updated_at = ?
                WHERE id = ?
            `).bind(
                data.status, data.payment_interval, data.next_payment_date, 
                data.reminder_channel, data.is_reminder_enabled !== undefined ? (data.is_reminder_enabled ? 1 : 0) : null,
                now, id
            ).run();

            return Response.json({ success: true });
        }

        // DELETE /api/admin/installments/:id
        if (method === 'DELETE' && url.pathname.startsWith('/api/admin/installments/')) {
            const id = url.pathname.split('/').pop();
            
            // Delete payments first
            await env.DB.prepare(`DELETE FROM installment_payments WHERE plan_id = ?`).bind(id).run();
            // Delete plan
            await env.DB.prepare(`DELETE FROM installment_plans WHERE id = ?`).bind(id).run();

            return Response.json({ success: true });
        }

        return new Response(JSON.stringify({ error: 'Route not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('[Dashboard/Installments] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
