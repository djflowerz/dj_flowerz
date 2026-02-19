
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
        const { email, source, fields, groups } = await req.json();

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
        }

        // 1. Sync with MailerLite
        let mailerLiteResult = { success: false, error: 'MailerLite API Key missing' };

        if (MAILERLITE_API_KEY) {
            try {
                const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
                    },
                    body: JSON.stringify({
                        email,
                        fields: fields || {},
                        groups: groups || [],
                    }),
                });

                const result = await response.json();
                if (response.ok) {
                    mailerLiteResult = { success: true, error: '' };
                } else {
                    mailerLiteResult = { success: false, error: result.message || 'Failed to subscribe' };
                }
            } catch (err: any) {
                mailerLiteResult = { success: false, error: err.message };
            }
        }

        // 2. Add to local database (newsletter_subscribers)
        const { error: dbError } = await supabase.from('newsletter_subscribers').upsert({
            email,
            source: source || 'Website',
            status: 'active',
            updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

        if (dbError) {
            console.error('DB Error adding subscriber:', dbError);
        }

        return new Response(JSON.stringify({
            success: mailerLiteResult.success,
            error: mailerLiteResult.error,
            dbStatus: dbError ? 'error' : 'success'
        }), {
            status: mailerLiteResult.success ? 200 : 500,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
