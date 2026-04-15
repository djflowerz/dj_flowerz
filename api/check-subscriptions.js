/**
 * Netlify Function: check-subscriptions
 * Can be triggered manually at /.netlify/functions/check-subscriptions
 * Scheduled version lives in netlify/functions/check-subscriptions.js
 */
export const handler = async (event) => {
  // Security: validate cron secret (sent via x-cron-secret header or Bearer token)
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = event.headers?.authorization || '';
  const cronHeader = event.headers?.['x-cron-secret'] || '';

  if (cronSecret) {
    const isAuthorised =
      authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret;
    if (!isAuthorised) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }
  }

  try {
    const { getR2Collection, updateR2Item } = await import('../utils/server-r2.js');
    const nodemailer = await import('nodemailer');

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

    const profiles = await getR2Collection('profiles');
    const subscriptions = await getR2Collection('subscriptions');

    const expiredProfiles = profiles.filter(
      (p) => p.is_subscriber === true && p.subscription_expiry < now
    );

    for (const profile of expiredProfiles) {
      try {
        await updateR2Item('profiles', profile.id, {
          is_subscriber: false,
          subscription_plan: null,
          subscription_expiry: null,
          updated_at: now,
        });

        const activeSub = subscriptions.find(
          (s) => s.user_id === profile.id && s.status === 'active'
        );
        if (activeSub) {
          await updateR2Item('subscriptions', activeSub.id, {
            status: 'expired',
            updated_at: now,
          });
        }

        if (GMAIL_APP_PASSWORD && profile.email) {
          const plan = profile.subscription_plan || 'Premium';
          await mailer.sendMail({
            from: `"DJ Flowerz" <${GMAIL_USER}>`,
            replyTo: 'admin@djflowerz.co.ke',
            to: profile.email,
            subject: `DJ Flowerz — Subscription Update`,
            html: `<p>Hi ${profile.name || 'Subscriber'},</p>
<p>Your DJ Flowerz ${plan} subscription has expired. Renew now to keep your music pool access!</p>
<p><a href="https://djflowerz.co.ke/subscriptions">Renew your subscription</a></p>
<br/><p>— DJ Flowerz Team</p>`,
          });
        }
        results.expired++;
      } catch (err) {
        results.errors.push(`expire-${profile.id}: ${err.message}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ...results }),
    };
  } catch (error) {
    console.error('Cron Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
    };
  }
};
