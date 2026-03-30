// worker/api/user/installments.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleUserInstallments(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const user = await getAuthorizedUser(request, env);
    if (!user || !user.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    const userId = user.id;

    try {
        // GET /api/user/installments - fetch caller's installment plans
        if (method === 'GET' && url.pathname === '/api/user/installments') {
            const { results: plans } = await env.DB.prepare(`
                SELECT * FROM installment_plans 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            `).bind(userId).all();

            // For each plan, fetch its payment history
            const plansWithPayments = await Promise.all(plans.map(async (plan) => {
                const { results: payments } = await env.DB.prepare(`
                    SELECT * FROM installment_payments 
                    WHERE plan_id = ? 
                    ORDER BY created_at ASC
                `).bind(plan.id).all();
                
                return {
                    ...plan,
                    payments: payments || []
                };
            }));

            return new Response(JSON.stringify(plansWithPayments), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // POST /api/user/installments/pay - initiate payment for next installment
        if (method === 'POST' && url.pathname === '/api/user/installments/pay') {
            const { planId } = await request.json();
            if (!planId) {
                return new Response(JSON.stringify({ error: 'Plan ID required' }), { status: 400 });
            }

            // 1. Fetch the plan and verify ownership
            const plan = await env.DB.prepare(`
                SELECT * FROM installment_plans WHERE id = ? AND user_id = ?
            `).bind(planId, userId).first();

            if (!plan) {
                return new Response(JSON.stringify({ error: 'Plan not found or unauthorized' }), { status: 404 });
            }

            if (plan.status === 'completed') {
                return new Response(JSON.stringify({ error: 'Plan already fully paid' }), { status: 400 });
            }

            if (plan.status === 'frozen') {
                return new Response(JSON.stringify({ error: 'Plan is frozen. Please contact support.' }), { status: 403 });
            }

            // 2. Calculate payment amount
            // For now, we take the balance divided by remaining installments, or a fixed amount.
            // Minimum payment: balance / remaining, but capped at total_amount / total_installments.
            const remainingBalance = plan.total_amount - plan.paid_amount;
            const remainingInstallments = Math.max(1, plan.installments_count - (plan.paid_amount > 0 ? Math.floor(plan.paid_amount / (plan.total_amount / plan.installments_count)) : 0));
            const nextAmount = Math.ceil(remainingBalance / remainingInstallments);

            // 3. Initialize Paystack
            const reference = `LPP_${planId}_${Date.now()}`;
            const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: user.email,
                    amount: Math.round(nextAmount * 100), // in cents
                    reference,
                    callback_url: `${env.VITE_APP_URL || 'https://www.djflowerz.co.ke'}/account/installments?status=success`,
                    metadata: {
                        planId: plan.id,
                        type: 'installment',
                        userId: user.id,
                        userName: user.full_name || user.username || 'Legend',
                        productName: plan.product_name || "Order Installment"
                    }
                })
            });

            const paystackData = await paystackRes.json();
            if (!paystackRes.ok) {
                return new Response(JSON.stringify({ error: paystackData.message || 'Paystack initialization failed' }), { status: 500 });
            }

            return new Response(JSON.stringify({
                authorizationUrl: paystackData.data.authorization_url,
                reference: paystackData.data.reference
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

    } catch (err) {
        console.error('[User/Installments] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
