
import { createClient } from '@supabase/supabase-js';

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
        const { userId, adminEmail } = await req.json();

        // Verify Admin Email (Basic Check)
        if (!adminEmail || adminEmail !== process.env.VITE_ADMIN_EMAIL) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin email mismatch' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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
