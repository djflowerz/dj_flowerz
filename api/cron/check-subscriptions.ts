/**
 * GET /api/cron/check-subscriptions
 * Checks for expired subscriptions, terminates access, and notifies users.
 * Schedule: Run this via Vercel Cron every hour (vercel.json cron config).
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function sendNotification(email: string, fields: Record<string, any>) {
    const apiKey = process.env.MAILERLITE_API_KEY || process.env.VITE_MAILERLITE_API_KEY;
    if (!apiKey || !email) return;
    try {
        await fetch('https://connect.mailerlite.com/api/subscribers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ email, fields: { ...fields, last_interaction: new Date().toISOString() } })
        });
    } catch (err) {
        console.error('[CRON] Notification failed:', err);
    }
}

export default async function handler(req: any, res: any) {
    // Security: only allow GET from Vercel cron or admin
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET || '';
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // Allow Vercel cron (passes specific header)
        if (!req.headers['x-vercel-cron-signature']) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const results = { expired: 0, errors: [] as string[] };
    const now = new Date().toISOString();

    // ── 1. Find and terminate expired subscriptions ─────────────────────────
    try {
        const { data: expiredProfiles } = await supabase
            .from('profiles')
            .select('id, email, name, subscription_plan, subscription_expiry')
            .eq('is_subscriber', true)
            .lt('subscription_expiry', now);

        for (const profile of expiredProfiles || []) {
            try {
                // Terminate access in Supabase
                await supabase.from('profiles').update({
                    is_subscriber: false,
                    subscription_plan: null,
                    subscription_expiry: null,
                    updated_at: now
                }).eq('id', profile.id);

                // Update subscription record
                await supabase.from('subscriptions')
                    .update({ status: 'expired', updated_at: now })
                    .eq('user_id', profile.id)
                    .eq('status', 'active');

                // Send expiry notification
                await sendNotification(profile.email, {
                    name: profile.name || 'Subscriber',
                    subscription_status: 'expired',
                    customer_type: 'subscriber',
                    notification: `Your DJ Flowerz ${profile.subscription_plan} subscription has expired. Renew now to keep your music pool access!`,
                    subscription_plan: profile.subscription_plan
                });

                results.expired++;
                console.log(`[CRON] Terminated subscription for ${profile.email}`);
            } catch (err: any) {
                results.errors.push(`expire-${profile.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        results.errors.push(`expired-query: ${err.message}`);
    }

    console.log('[CRON] Done:', results);
    return res.status(200).json({ success: true, ...results });
}
