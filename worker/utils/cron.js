// worker/utils/cron.js
import { syncPool } from './poolSync.js';

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
    } catch (error) {
        console.error("[Cron Error]", error);
    }
}
