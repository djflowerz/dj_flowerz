// worker/api/webhooks/supabase.js
import { sendEmail } from '../../utils/email.js';
import { templates } from '../../utils/templates.js';

export async function handleSupabaseWebhook(request, env) {
    const signature = request.headers.get('x-supabase-signature');
    const secret = env.SUPABASE_WEBHOOK_SECRET;

    // Optional: Verify signature if secret is provided
    if (secret && signature !== secret) {
        console.error('[Supabase Webhook] Invalid signature');
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const { record, type, table, schema } = body;

        // Supabase Auth sends standard payloads for Auth Hook or Database Webhook
        // If it's a Database Webhook on the 'auth.users' or 'public.profiles' table
        const user = record || body;
        const email = user.email;
        const id = user.id;
        const fullName = user.raw_user_meta_data?.full_name || user.full_name || '';

        if (!email || !id) {
            console.error('[Supabase Webhook] Missing email or id:', body);
            return new Response("Missing data", { status: 400 });
        }

        console.log(`[Supabase Webhook] Syncing user: ${email} (${id}) - Type: ${type || 'unknown'}`);

        // 1. Upsert into D1 Profiles
        await env.DB.prepare(`
            INSERT INTO profiles (id, email, full_name, supabase_id, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                email = excluded.email,
                full_name = COALESCE(excluded.full_name, profiles.full_name),
                supabase_id = excluded.supabase_id,
                updated_at = excluded.updated_at
        `).bind(id, email, fullName, id).run();

        // 2. Sync to R2 for fast frontend access (optional but recommended in this setup)
        try {
            const profileData = {
                id,
                email,
                full_name: fullName,
                supabase_id: id,
                updated_at: new Date().toISOString()
            };
            
            // Check if we already have data to merge (to avoid overwriting subscription info)
            const existingR2 = await env.PROFILES_BUCKET.get(`profiles/${id}.json`);
            if (existingR2) {
                const existing = await existingR2.json();
                Object.assign(existing, profileData);
                await env.PROFILES_BUCKET.put(`profiles/${id}.json`, JSON.stringify(existing));
            } else {
                await env.PROFILES_BUCKET.put(`profiles/${id}.json`, JSON.stringify(profileData));
                
                // NEW USER: Send Welcome Email
                ctx.waitUntil(sendEmail({
                    to: email,
                    subject: 'Welcome to DJ FLOWERZ! 🎧',
                    html: templates.welcome(fullName || 'Legend'),
                    text: `Welcome to DJ FLOWERZ, ${fullName}! Your account is now active.`
                }, env));
            }
        } catch (r2Err) {
            console.error('[Supabase Webhook] R2 Sync Error:', r2Err);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.error('[Supabase Webhook] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
