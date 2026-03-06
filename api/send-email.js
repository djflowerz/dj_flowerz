export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { to, subject, html, text, fromName, replyTo } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    try {
        const nodemailer = await import("nodemailer");

        const GMAIL_USER = (process.env.GMAIL_USER || 'djflowerz254@gmail.com').trim();
        const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').trim();
        const DEFAULT_SENDER_NAME = 'DJ FLOWERZ';
        const DEFAULT_REPLY_TO = (process.env.EMAIL_NOREPLY || 'noreply@djflowerz.co.ke').trim();

        if (!GMAIL_APP_PASSWORD) {
            console.error('SMTP Error: GMAIL_APP_PASSWORD is not configured');
            return res.status(500).json({ error: 'Mail server configuration missing' });
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
        console.log('Email sent successfully:', result.messageId);

        return res.status(200).json({
            success: true,
            messageId: result.messageId,
            recipientCount: Array.isArray(to) ? to.length : 1
        });

    } catch (error) {
        console.error('Email API Error:', error);
        return res.status(500).json({
            error: 'Failed to send email',
            details: error.message
        });
    }
}
