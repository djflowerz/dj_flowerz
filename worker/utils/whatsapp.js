// worker/utils/whatsapp.js
// Sends WhatsApp messages via Twilio REST API

/**
 * sendWhatsApp - Send a WhatsApp message via Twilio
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   - Your Twilio Account SID
 *   TWILIO_AUTH_TOKEN    - Your Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM - Twilio sender, e.g. "whatsapp:+14155238886"
 *
 * @param {string} to  - Recipient number e.g. "+254789783258"
 * @param {string} body - Message text
 * @param {object} env  - Cloudflare env bindings
 */
export async function sendWhatsApp(to, body, env) {
    const sid   = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;
    const from  = env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    if (!sid || !token) {
        console.warn('[WhatsApp] Twilio credentials not configured – skipping');
        return false;
    }

    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    try {
        const credentials = btoa(`${sid}:${token}`);
        const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    From: from,
                    To: toFormatted,
                    Body: body,
                }).toString(),
            }
        );

        const data = await res.json();
        if (!res.ok) {
            console.error('[WhatsApp] Twilio error:', data);
            return false;
        }
        console.log('[WhatsApp] Sent:', data.sid);
        return true;
    } catch (err) {
        console.error('[WhatsApp] Failed:', err);
        return false;
    }
}
