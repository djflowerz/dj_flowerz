import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardUsers(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (request.method === 'GET') {
            const query = `
                SELECT 
                    id, name, email, role, is_subscriber, subscription_plan, 
                    subscription_expiry, created_at, last_seen, presence_status, has_used_trial
                FROM profiles
                ORDER BY created_at DESC
            `;
            const { results } = await env.DB.prepare(query).all();

            return new Response(JSON.stringify(results), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        return new Response('Method Not Allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (error) {
        console.error('Admin Users API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
