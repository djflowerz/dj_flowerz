import { syncPool } from './poolSync.js';
import { sendEmail } from './email.js';

export async function handleScheduled(event, env, ctx) {
    console.log("[Cron] Running maintenance...");
    
    // 1. Sync Music Pool from external sources
    try {
        await syncPool(env);
    } catch (err) {
        console.error("[Cron] Music Pool Sync failed:", err);
    }
    
    try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

        // 1. Find trials expiring in the next 24 hours that haven't had a warning sent
        const expiringTrials = await env.DB.prepare(`
            SELECT t.*, p.email 
            FROM trial_usage t
            JOIN profiles p ON t.supabase_user_id = p.id
            WHERE t.status = 'active' 
            AND t.trial_expires_at <= ? 
            AND t.warning_sent = 0
        `).bind(tomorrow).all();

        if (expiringTrials.results && expiringTrials.results.length > 0) {
            for (const trial of expiringTrials.results) {
                console.log(`[Cron] Sending warning to ${trial.email}`);
                // TODO: Integrate with Resend API
                // await sendExpiryWarningEmail(trial.email, env);
                
                await env.DB.prepare(`
                    UPDATE trial_usage SET warning_sent = 1 WHERE canonical_email = ?
                `).bind(trial.canonical_email).run();
            }
        }

        // 2. Find expired trials
        const expiredTrials = await env.DB.prepare(`
            SELECT * FROM trial_usage 
            WHERE status = 'active' 
            AND trial_expires_at <= ?
        `).bind(now).all();

        if (expiredTrials.results && expiredTrials.results.length > 0) {
            for (const trial of expiredTrials.results) {
                console.log(`[Cron] Expiring trial for ${trial.supabase_user_id}`);
                
                // Batch update: set status to expired and revoke subscriber access in profiles
                await env.DB.batch([
                    env.DB.prepare(`UPDATE trial_usage SET status = 'expired' WHERE canonical_email = ?`).bind(trial.canonical_email),
                    env.DB.prepare(`UPDATE profiles SET is_subscriber = 0, subscription_plan = NULL WHERE id = ?`).bind(trial.supabase_user_id)
                ]);

                // Update R2 Cache
                const userId = trial.supabase_user_id;
                const existingR2 = await env.PROFILES_BUCKET.get(`profiles/${userId}.json`);
                if (existingR2) {
                    const r2Profile = await existingR2.json();
                    r2Profile.is_subscriber = 0;
                    r2Profile.subscription_plan = null;
                    r2Profile.updated_at = new Date().toISOString();
                    await env.PROFILES_BUCKET.put(`profiles/${userId}.json`, JSON.stringify(r2Profile));
                }
            }
        }

        console.log("[Cron] Trial maintenance complete.");

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

    } catch (error) {
        console.error("[Cron Error]", error);
    }
}
