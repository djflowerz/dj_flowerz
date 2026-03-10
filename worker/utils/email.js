// worker/utils/email.js

export async function sendEmail(env, { to, subject, html, from = "DJ Flowerz <no-reply@djflowerz.co.ke>" }) {
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
            body: JSON.stringify({ from, to, subject, html })
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
