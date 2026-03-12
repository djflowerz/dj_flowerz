// worker/api/dashboard/users.js
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
            // Try D1 first
            let results = [];
            try {
                const query = `
                    SELECT 
                        id, name, email, role, is_subscriber, subscription_plan, 
                        subscription_expiry, created_at, last_seen, presence_status, has_used_trial
                    FROM profiles
                    ORDER BY created_at DESC
                `;
                const d1Result = await env.DB.prepare(query).all();
                results = d1Result.results || [];
            } catch (e) {
                console.warn('[Users] D1 query failed:', e.message);
            }

            // If D1 returns nothing, fall back to R2 bucket (profiles stored as JSON objects)
            if (results.length === 0 && env.PROFILES_BUCKET) {
                try {
                    const r2Object = await env.PROFILES_BUCKET.get('data/profiles.json');
                    if (r2Object) {
                        const r2Data = await r2Object.json();
                        results = Array.isArray(r2Data) ? r2Data : [];
                        console.log(`[Users] Loaded ${results.length} users from R2 fallback`);
                    }
                } catch (r2Err) {
                    console.warn('[Users] R2 fallback also failed:', r2Err.message);
                }
            }

            return new Response(JSON.stringify(results), {
                status: 200,
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
                full_name: 'name',
                name: 'name',
                phone_number: 'phone',
                is_subscriber: 'is_subscriber',
                referral_balance_kes: 'referral_balance_kes',
                referral_code: 'referral_code',
                role: 'role'
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
                await env.DB.prepare(
                    `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`
                ).bind(...values).run();
            }

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
