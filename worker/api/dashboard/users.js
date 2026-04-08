// worker/api/dashboard/users.js
// [VERIFIED] User profile management and directory sync for admin dashboard.
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
            // Fetch directly from D1 (Bypass R2 for Admin as requested)
            const query = `
                SELECT 
                    id, full_name AS name, email, role, is_subscriber, subscription_plan,
                    subscription_expiry, created_at, last_login, presence_status,
                    phone_number, referral_code, referral_balance AS referral_balance_kes,
                    loyalty_points
                FROM profiles
                ORDER BY created_at DESC
            `;
            const { results } = await env.DB.prepare(query).all();
            console.log(`[Dashboard/Users] Found ${results?.length || 0} profiles in D1`);
            return new Response(JSON.stringify(results || []), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            });
        }

        // POST /api/admin/users — create a new user profile
        if (request.method === 'POST') {
            const body = await request.json();
            const id = crypto.randomUUID();

            await env.DB.prepare(`
                INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(id, body.email, body.full_name || body.name, body.role || 'user').run();

            return new Response(JSON.stringify({ success: true, id }), {
                status: 201,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // PUT /api/admin/users/:id — update a user profile
        if (request.method === 'PUT') {
            const url = new URL(request.url);
            const pathParts = url.pathname.split('/');
            const userId = pathParts[pathParts.length - 1];
            const body = await request.json();

            const fields = [];
            const values = [];
            const fieldMap = {
                full_name: 'full_name',
                name: 'full_name',
                phone_number: 'phone_number',
                phone: 'phone_number',
                is_subscriber: 'is_subscriber',
                referral_balance_kes: 'referral_balance',
                referral_code: 'referral_code',
                role: 'role',
                subscription_plan: 'subscription_plan',
                subscription_expiry: 'subscription_expiry',
                daily_download_count: 'daily_download_count',
                last_download_reset: 'last_download_reset',
                loyalty_points: 'loyalty_points'
            };

            for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
                if (body[jsKey] !== undefined) {
                    fields.push(`${dbCol} = ?`);
                    values.push(body[jsKey]);
                }
            }

            if (fields.length > 0) {
                fields.push('updated_at = CURRENT_TIMESTAMP');
                values.push(userId);
                const result = await env.DB.prepare(
                    `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`
                ).bind(...values).run();
                console.log(`[Users] Update result for ${userId}:`, result);
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // DELETE /api/admin/users/:id — remove a user profile
        if (request.method === 'DELETE') {
            const url = new URL(request.url);
            const pathParts = url.pathname.split('/');
            const userId = pathParts[pathParts.length - 1];

            const result = await env.DB.prepare(
                `DELETE FROM profiles WHERE id = ?`
            ).bind(userId).run();
            console.log(`[Users] Delete result for ${userId}:`, result);

            return new Response(JSON.stringify({ success: true }), {
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
