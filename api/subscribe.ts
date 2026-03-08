import { addR2Item, getR2Collection, addAdminNotification, saveR2Collection } from '../utils/server-r2';
import { sendEmail } from './_mailer';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, source = 'Website' } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    try {
        // 1. Get current subscribers from R2
        let subscribers = await getR2Collection<any>('newsletter_subscribers');

        // 2. Check if already subscribed
        if (subscribers.some(s => s.email?.toLowerCase() === email.toLowerCase())) {
            return res.status(200).json({ success: true, message: 'Already subscribed' });
        }

        // 3. Add new subscriber
        const now = new Date().toISOString();
        const newSubscriber = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            email,
            date_subscribed: now,
            status: 'active',
            source,
            updatedAt: now
        };

        subscribers.unshift(newSubscriber);
        await saveR2Collection('newsletter_subscribers', subscribers.slice(0, 10000));

        // 4. Send Welcome Email & Notify Admin
        try {
            // User Welcome Email
            const userHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                    <h1 style="color: #a855f7; margin-bottom: 10px;">Welcome Aboard!</h1>
                    <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Thanks for joining the DJ FLOWERZ newsletter. You're now on the list for exclusive mixtapes, store drops, and music pool updates.</p>
                    <div style="background: #15151a; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #ffffff10;">
                        <p style="margin: 0; color: #ffffff;"><strong>Enjoying the vibes?</strong> Stay tuned for our next drop coming soon!</p>
                    </div>
                    <a href="https://djflowerz.co.ke" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Visit Website</a>
                    <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                    <p style="font-size: 10px; color: #4b5563; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">© ${new Date().getFullYear()} DJ FLOWERZ. All rights reserved.</p>
                </div>
            `;

            await sendEmail({
                to: email,
                subject: "Welcome to the DJ FLOWERZ Community! 🎧",
                html: userHtml,
                fromName: 'DJ Flowerz'
            }).catch(e => console.error("Welcome email failed:", e.message));

            // Admin Notify Email
            const adminHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                    <h1 style="color: #a855f7; margin-bottom: 20px;">New Newsletter Subscriber</h1>
                    <div style="background: #15151a; padding: 20px; border-radius: 12px; border: 1px solid #ffffff10;">
                        <p style="margin: 0; color: #ffffff;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 5px 0; color: #9ca3af;"><strong>Source:</strong> ${source}</p>
                        <p style="margin: 5px 0; color: #9ca3af;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            `;
            await sendEmail({
                to: process.env.GMAIL_USER || 'djflowerz254@gmail.com',
                subject: `New Subscriber: ${email}`,
                html: adminHtml,
                fromName: 'DJ Flowerz'
            }).catch(e => console.error("Admin notification email failed:", e.message));

        } catch (mailerErr) {
            console.error('Subscription mailer failed:', mailerErr);
        }

        // 5. Add App Notification (Admin Dashboard)
        try {
            await addAdminNotification(
                `New Newsletter Subscriber`,
                `${email} subscribed via ${source}`,
                'promotion'
            );
        } catch (ntfErr) {
            console.error('Failed to add admin notification:', ntfErr);
        }

        return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } catch (error: any) {
        console.error('Subscription error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred'
        });
    }
}
