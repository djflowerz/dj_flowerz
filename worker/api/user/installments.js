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

        return new Response(JSON.stringify({ error: 'Route not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        console.error('[User/Installments] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
