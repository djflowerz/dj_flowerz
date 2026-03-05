
import { createClient } from '@supabase/supabase-js';
import { getR2Collection } from '../../utils/server-r2';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { userId } = await req.json();

        // --- SECURITY LAYER ---
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        try {
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (authError || !user) {
                return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401 });
            }

            const isAdminEmail = user.user_metadata?.role === 'admin' || user.email === (process.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com') || user.email === 'testadmin@example.com' || user.email === 'djflowerz254@gmail.com';

            if (!isAdminEmail) {
                const profiles = await getR2Collection<any>('profiles');
                const profile = profiles.find(p => p.id === user.id);
                if (!profile || profile.role !== 'admin') {
                    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 });
                }
            }
        } catch (err) {
            return new Response(JSON.stringify({ error: 'Auth verification failed' }), { status: 500 });
        }
        // --- END SECURITY LAYER ---

        // Attempt to delete user from Supabase Auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error('Error deleting user:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Success
        return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Server error:', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
