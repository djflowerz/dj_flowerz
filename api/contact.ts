import { addR2Item, getR2Collection, addAdminNotification, saveR2Collection } from '../utils/server-r2';
import { sendEmail } from './_mailer';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { name, email, subject, message, source = 'web' } = req.body;

    if (!email || !message) {
        return res.status(400).json({ error: 'Email and message are required' });
    }

    try {
        // 1. Save to R2
        const newMessage = {
            id: `msg_${Date.now()}`,
            name,
            email,
            subject,
            message,
            source,
            status: 'new',
            createdAt: new Date().toISOString()
        };

        const messages = await getR2Collection<any>('contact_messages');
        messages.unshift(newMessage);
        await saveR2Collection('contact_messages', messages.slice(0, 5000));

        // 2. Notify Admin via Email
        try {
            const adminHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                    <h1 style="color: #a855f7; margin-bottom: 20px;">New Contact Message</h1>
                    <div style="background: #15151a; padding: 20px; border-radius: 12px; border: 1px solid #ffffff10;">
                        <p style="margin: 5px 0; color: #9ca3af;"><strong>From:</strong> ${name} (${email})</p>
                        <p style="margin: 5px 0; color: #9ca3af;"><strong>Subject:</strong> ${subject}</p>
                        <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 15px 0;">
                        <p style="margin: 0; color: #ffffff; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <p style="font-size: 12px; color: #4b5563; margin-top: 20px;">Source: ${source} | Time: ${newMessage.createdAt}</p>
                </div>
            `;

            await sendEmail({
                to: process.env.GMAIL_USER || 'djflowerz254@gmail.com',
                subject: `New Message: ${subject} from ${name}`,
                html: adminHtml,
                fromName: 'DJ Flowerz Website'
            });
        } catch (mailErr) {
            console.error('Contact admin email failed:', mailErr);
        }

        // 3. Add App Notification (Admin Dashboard)
        await addAdminNotification(
            `New Contact: ${name}`,
            `${subject || 'No Subject'}`,
            'info',
            `/admin?tab=messages&id=${newMessage.id}`
        );

        return res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error: any) {
        console.error('Contact API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
