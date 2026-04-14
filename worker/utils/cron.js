import { syncPool } from './poolSync.js';
import { sendEmail } from './email.js';
import { templates } from './templates.js';
import { scrapeAndSave } from '../api/dashboard/scraped_tracks.js';

export async function handleScheduled(event, env, ctx) {
    console.log("[Cron] Running maintenance...");
    
    // 1. Sync Music Pool from external sources (Auto-import)
    try {
        await syncPool(env);
    } catch (err) {
        console.error("[Cron] Music Pool Sync failed:", err);
    }

    // 2. Trigger Search Pool Scraper (Manual queue)
    try {
        await scrapeAndSave(env);
    } catch (err) {
        console.error("[Cron] Search Pool Scraper failed:", err);
    }
    
    try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);


        const expiredSubs = await env.DB.prepare(`
            UPDATE profiles 
            SET is_subscriber = 0, subscription_plan = NULL 
            WHERE is_subscriber = 1 
            AND subscription_expiry IS NOT NULL 
            AND datetime(subscription_expiry) < datetime('now')
            RETURNING id, email, full_name
        `).run();

        if (expiredSubs.results && expiredSubs.results.length > 0) {
            console.log(`[Cron] Expired ${expiredSubs.results.length} regular subscriptions.`);
            for (const row of expiredSubs.results) {
                const { id: userId, email, full_name } = row;
                
                // 1. Send Expiry Email
                if (email) {
                    try {
                        await sendEmail({
                            to: email,
                            subject: 'Your Premium Access has Expired 🎧',
                            html: templates.subscriptionExpiry(full_name || 'Legend', new Date().toLocaleDateString(), 'https://djflowerz.co.ke/checkout'),
                            text: `Hello ${full_name}, your subscription has expired. Renew here: https://www.djflowerz.co.ke/checkout`
                        }, env);
                    } catch (e) {
                         console.error(`[Cron] Expiry email failed for ${email}:`, e);
                    }
                }

                // 2. Update R2 Cache
                try {
                    const existingR2 = await env.PROFILES_BUCKET.get(`profiles/${userId}.json`);
                    if (existingR2) {
                        const r2Profile = await existingR2.json();
                        r2Profile.is_subscriber = 0;
                        r2Profile.subscription_plan = null;
                        r2Profile.updated_at = new Date().toISOString();
                        await env.PROFILES_BUCKET.put(`profiles/${userId}.json`, JSON.stringify(r2Profile));
                    }
                } catch (r2Err) {
                    console.error(`[Cron] Failed to update R2 for expired user ${userId}:`, r2Err);
                }
            }

            // Log activity
            await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                .bind("EXPIRY_NOTIFICATIONS_SENT", `${expiredSubs.results.length} expiry emails sent`).run();
        }

        // 4. Send Reminders (Expiring in 24-48 hours)
        try {
            const expiringSoon = await env.DB.prepare(`
                SELECT email, full_name, subscription_expiry 
                FROM profiles 
                WHERE is_subscriber = 1 
                AND subscription_expiry IS NOT NULL 
                AND datetime(subscription_expiry) > datetime('now')
                AND datetime(subscription_expiry) < datetime('now', '+2 days')
                AND (last_reminder_sent IS NULL OR datetime(last_reminder_sent) < datetime('now', '-7 days'))
            `).all();

            if (expiringSoon.results && expiringSoon.results.length > 0) {
                let count = 0;
                for (const dj of expiringSoon.results) {
                    if (!dj.email) continue;
                    
                    const success = await sendEmail({
                        to: dj.email,
                        subject: "Don't Stop the Music! 🎧 Your Access Expires Soon",
                        html: templates.subscriptionExpiry(dj.full_name || 'Legend', new Date(dj.subscription_expiry).toLocaleDateString(), 'https://djflowerz.co.ke/checkout'),
                        text: `Hi ${dj.full_name}, your music pool access expires on ${new Date(dj.subscription_expiry).toLocaleDateString()}. Renew here: https://www.djflowerz.co.ke/checkout`
                    }, env);

                    if (success) {
                        count++;
                        await env.DB.prepare("UPDATE profiles SET last_reminder_sent = ? WHERE email = ?")
                            .bind(new Date().toISOString(), dj.email).run();
                    }
                }
                
                if (count > 0) {
                    await env.DB.prepare("INSERT INTO admin_logs (action, details) VALUES (?, ?)")
                        .bind("EXPIRY_REMINDERS_SENT", `${count} reminder emails sent`).run();
                }
            }
        } catch (remindError) {
            console.error("[Cron] Expiry Reminder Error:", remindError);
        }

        console.log("[Cron] General maintenance complete.");

        // 3. Lipa Pole Pole (Installment) Reminders
        try {
            const today = new Date().toISOString().split('T')[0];
            const overduePlans = await env.DB.prepare(`
                SELECT p.*, prof.email, prof.full_name
                FROM installment_plans p
                JOIN profiles prof ON p.user_id = prof.id
                WHERE p.status = 'active' 
                AND p.is_reminder_enabled = 1
                AND p.next_payment_date <= ?
            `).bind(today).all();

            if (overduePlans.results && overduePlans.results.length > 0) {
                for (const plan of overduePlans.results) {
                    console.log(`[Cron] Sending installment reminder to ${plan.email} for ${plan.product_name}`);
                    
                    await sendEmail({
                        to: plan.email,
                        subject: `🔔 Reminder: Your ${plan.product_name} Payment is Due`,
                        fromEmail: 'payments@djflowerz.co.ke',
                        fromName: 'DJ FLOWERZ Payments',
                        html: `
                            <div style="font-family: sans-serif; background: #0b0b0f; border: 1px solid #1a1a20; padding: 30px; color: #ffffff;">
                                <h2 style="color: #a855f7;">Payment Reminder</h2>
                                <p>Hello ${plan.full_name || 'Legend'},</p>
                                <p>This is a friendly reminder that your installment payment for <strong>${plan.product_name}</strong> is due.</p>
                                <div style="background: #15151a; padding: 20px; border-radius: 8px; border: 1px solid #ffffff08; margin: 20px 0;">
                                    <p><strong>Product:</strong> ${plan.product_name}</p>
                                    <p><strong>Remaining Balance:</strong> KSh ${plan.balance.toLocaleString()}</p>
                                    <p><strong>Due Date:</strong> ${new Date(plan.next_payment_date).toLocaleDateString()}</p>
                                </div>
                                <p>Please visit your profile to make a payment and keep your plan active.</p>
                                <div style="margin-top: 30px;">
                                    <a href="https://www.djflowerz.co.ke/profile" style="background: #a855f7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Pay Now</a>
                                </div>
                            </div>
                        `,
                        text: `Reminder: Your payment for ${plan.product_name} is due. Balance: KSh ${plan.balance}. Pay here: https://www.djflowerz.co.ke/profile`
                    }, env);
                }
            }
            console.log("[Cron] Installment reminders complete.");
        } catch (instError) {
            console.error("[Cron] Installment Reminder Error:", instError);
        }

        // 4. DAILY ADMIN SUMMARY
        try {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            const [newUsers, revenue, openTickets, activeChats] = await Promise.all([
                env.DB.prepare("SELECT COUNT(*) as count FROM profiles WHERE created_at > ?").bind(last24h).first('count'),
                env.DB.prepare("SELECT SUM(total_amount) as total FROM store_orders WHERE payment_status = 'paid' AND created_at > ?").bind(last24h).first('total'),
                env.DB.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'pending'").first('count'),
                env.DB.prepare("SELECT COUNT(*) as count FROM chat_sessions WHERE status = 'active'").first('count')
            ]);

            await sendEmail({
                to: env.GMAIL_USER || 'admin@djflowerz.co.ke',
                subject: '📊 DJ Flowerz Daily Pulse Summary',
                html: templates.adminDailySummary({
                    newSignups: newUsers || 0,
                    totalPayments: revenue || 0,
                    expiredSubs: (expiredSubs.results?.length || 0),
                    activeChats: (openTickets || 0) + (activeChats || 0)
                }),
                text: `Daily Summary: ${newUsers} new signups, KES ${revenue} revenue, ${expiredSubs.results?.length} expired subs.`
            }, env);
            
            console.log("[Cron] Daily Admin Summary sent.");
        } catch (summaryErr) {
            console.error("[Cron] Daily Summary Error:", summaryErr);
        }

    } catch (error) {
        console.error("[Cron Error]", error);
    }
}
