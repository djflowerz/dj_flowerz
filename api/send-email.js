import { sendEmail } from './_mailer.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { to, subject, html, text, fromName, fromEmail, replyTo } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    try {
        const result = await sendEmail({ to, subject, html, text, fromName, fromEmail, replyTo });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            error: 'Failed to send email',
            details: error.message
        });
    }
}
