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
            let results = [];
            try {
                const query = `SELECT * FROM profiles ORDER BY created_at DESC`;
                const res = await env.DB.prepare(query).all();
                results = res.results || [];
            } catch(e) {
                console.error('[Dashboard/Users] Query error', e.message);
            }
            
            // Post-process to handle offline timeout (e.g., 2 minutes)
            const now = Date.now();
            const processed = results.map(u => {
                let status = u.presence_status || 'offline';
                if (status === 'online' && u.last_seen) {
                    const lastSeen = new Date(u.last_seen).getTime();
                    if (now - lastSeen > 120000) { // 2 minutes
                        status = 'offline';
                    }
                }
                return { 
                    ...u, 
                    presence_status: status,
                    name: u.full_name || u.name || 'Anonymous DJ',
                    phone_number: u.phone_number || u.phone || '',
                    loyalty_points: u.loyalty_points || u.aura_points || 0
                };
            });

            console.log(`[Dashboard/Users] Found ${results?.length || 0} profiles in D1`);
            return Response.json(processed, {
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
                phone_number: 'phone',
                phone: 'phone',
                is_subscriber: 'is_subscriber',
                referral_balance_kes: 'referral_balance_kes',
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
