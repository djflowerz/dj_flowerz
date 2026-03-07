/**
 * Shared Mailer Utility for DJ FLOWERZ
 * This file is prefixed with _ so Vercel does not treat it as a public API route.
 */

export async function sendEmail({ to, subject, html, text, fromName, replyTo }) {
    try {
        const nodemailer = await import("nodemailer");

        const GMAIL_USER = (process.env.GMAIL_USER || 'djflowerz254@gmail.com').trim();
        const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').trim();
        const DEFAULT_SENDER_NAME = 'DJ FLOWERZ';
        const DEFAULT_REPLY_TO = (process.env.EMAIL_NOREPLY || 'noreply@djflowerz.co.ke').trim();

        if (!GMAIL_APP_PASSWORD) {
            throw new Error('GMAIL_APP_PASSWORD is not configured');
        }

        const transporter = nodemailer.default.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: GMAIL_USER,
                pass: GMAIL_APP_PASSWORD,
            },
        });

        const mailOptions = {
            from: `"${fromName || DEFAULT_SENDER_NAME}" <${GMAIL_USER}>`,
            replyTo: replyTo || DEFAULT_REPLY_TO,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: html,
            text: text || html.replace(/<[^>]*>?/gm, ''), // Basic fallback
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`[Mailer] Email sent to ${to}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error('[Mailer] Error:', error);
        throw error;
    }
}
