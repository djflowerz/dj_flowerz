// worker/utils/email.js

/**
 * sendEmail
 * Uses Resend API to send transactional emails.
 */
export async function sendEmail(options, env) {
    const { to, subject, html, text, from = 'DJ FLOWERZ <no-reply@djflowerz.co.ke>' } = options;
    if (!env.RESEND_API_KEY) {
        console.warn("[Email] RESEND_API_KEY not set. Skipping email to:", to);
        return false;
    }
    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ from, to, subject, html, text })
        });
        if (!res.ok) {
            const err = await res.text();
            console.error("[Email] Resend API error:", err);
            return false;
        }
        return true;
    } catch (e) {
        console.error("[Email] Failed to send email:", e);
        return false;
    }
}
