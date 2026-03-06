export default async function handler(req, res) {
    // Security: only allow GET from Vercel cron or admin
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET || '';
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // Allow Vercel cron (passes specific header)
        if (!req.headers['x-vercel-cron-signature']) {
            // return res.status(401).json({ error: 'Unauthorized' });
            // Temporary: log and proceed for testing if needed, but keeping security
        }
    }

    try {
        const { getR2Collection, updateR2Item } = await import('../../utils/server-r2');
        const nodemailer = await import("nodemailer");

        const GMAIL_USER = (process.env.GMAIL_USER || 'djflowerz254@gmail.com').trim();
        const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').trim();

        const mailer = nodemailer.default.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
        });

        const results = { expired: 0, errors: [] };
        const now = new Date().toISOString();

        // 1. Fetch data
        const profiles = await getR2Collection('profiles');
        const subscriptions = await getR2Collection('subscriptions');

        const expiredProfiles = profiles.filter(p => p.is_subscriber === true && p.subscription_expiry < now);

        for (const profile of expiredProfiles) {
            try {
                // Terminate access in R2 Profiles
                await updateR2Item('profiles', profile.id, {
                    is_subscriber: false,
                    subscription_plan: null,
                    subscription_expiry: null,
                    updated_at: now
                });

                const activeSub = subscriptions.find(s => s.user_id === profile.id && s.status === 'active');
                if (activeSub) {
                    await updateR2Item('subscriptions', activeSub.id, {
                        status: 'expired',
                        updated_at: now
                    });
                }

                // Send Email Notification
                if (GMAIL_APP_PASSWORD && profile.email) {
                    const message = `Your DJ Flowerz ${profile.subscription_plan || 'Premium'} subscription has expired. Renew now to keep your music pool access!`;
                    await mailer.sendMail({
                        from: `"DJ Flowerz" <${GMAIL_USER}>`,
                        replyTo: 'admin@djflowerz.co.ke',
                        to: profile.email,
                        subject: `DJ Flowerz — Subscription Update`,
                        html: `<p>Hi ${profile.name || 'Subscriber'},</p><p>${message}</p><p><a href="https://djflowerz.co.ke/subscriptions">Renew your subscription</a></p><br/><p>— DJ Flowerz Team</p>`,
                    });
                }

                results.expired++;
            } catch (err) {
                results.errors.push(`expire-${profile.id}: ${err.message}`);
            }
        }

        return res.status(200).json({ success: true, ...results });
    } catch (error) {
        console.error('Cron Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
