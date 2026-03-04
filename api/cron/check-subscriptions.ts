/**
 * GET /api/cron/check-subscriptions
 * Checks for expired subscriptions, terminates access, and notifies users.
 * Schedule: Run this via Vercel Cron every hour (vercel.json cron config).
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const GMAIL_USER = process.env.GMAIL_USER || 'djflowerz254@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const mailer = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

async function sendNotification(email: string, fields: Record<string, any>) {
    if (!email || !GMAIL_APP_PASSWORD) return;
    try {
        const message = fields.notification || `Your DJ Flowerz subscription has expired. Renew now to keep your access!`;
        await mailer.sendMail({
            from: `"DJ Flowerz" <${GMAIL_USER}>`,
            replyTo: 'admin@djflowerz.co.ke',
            to: email,
            subject: `DJ Flowerz — Subscription Update`,
            html: `<p>Hi ${fields.name || 'Subscriber'},</p><p>${message}</p><p><a href="https://djflowerz.co.ke/subscriptions">Renew your subscription</a></p><br/><p>— DJ Flowerz Team</p>`,
        });
    } catch (err) {
        console.error('[CRON] Email notification failed:', err);
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
