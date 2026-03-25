// worker/utils/email.js

/**
 * sendEmail
 * Uses Vercel SMTP endpoint to send transactional emails via Gmail.
 */
export async function sendEmail(options, env) {
    const { to, subject, html, text, fromName = 'DJ FLOWERZ', fromEmail } = options;
    
    try {
        const baseUrl = env?.VITE_APP_URL ? env.VITE_APP_URL.replace(/\/$/, '') : "https://djflowerz.co.ke";
        const endpoint = `${baseUrl}/api/send-email`;
        
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                to, 
                subject, 
                html, 
                text, 
                fromName, 
                fromEmail,
                replyTo: fromEmail || 'noreply@djflowerz.co.ke' 
            })
        });
        
        if (!res.ok) {
            const err = await res.text();
            console.error("[Email] Vercel SMTP API error:", err);
            return false;
        }
        return true;
    } catch (e) {
        console.error("[Email] Failed to send email via Vercel:", e);
        return false;
    }
}
