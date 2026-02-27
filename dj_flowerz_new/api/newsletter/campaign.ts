
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // Verify Admin Role
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isAdminEmail = user.email === process.env.VITE_ADMIN_EMAIL;

        if (profile?.role !== 'admin' && !isAdminEmail) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        const { subject, content, name, type = 'regular' } = await req.json();

        if (!subject || !content) {
            return new Response(JSON.stringify({ error: 'Subject and content are required' }), { status: 400 });
        }

        if (!MAILERLITE_API_KEY) {
            return new Response(JSON.stringify({ error: 'MailerLite API Key missing' }), { status: 500 });
        }

        // Create Campaign in MailerLite
        const response = await fetch('https://connect.mailerlite.com/api/campaigns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
            },
            body: JSON.stringify({
                name: name || `Admin Campaign - ${new Date().toLocaleDateString()}`,
                type,
                emails: [
                    {
                        subject,
                        from_name: 'DJ Flowerz',
                        from: 'noreply@djflowerz.com',
                        content,
                    }
                ]
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({ error: result.message || 'Failed to create campaign' }), { status: 500 });
        }

        // Log the campaign locally
        await supabase.from('newsletter_campaigns').insert({
            name: name || subject,
            subject,
            status: 'draft',
            type,
            mailerlite_id: result.data?.id,
            created_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, data: result.data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
