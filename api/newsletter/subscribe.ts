/**
 * api/newsletter/subscribe.ts
 * Public endpoint to subscribe to the newsletter.
 * Adds the email to R2 and sends a welcome email.
 */
import nodemailer from 'nodemailer';
import { getR2Collection, saveR2Collection } from '../../utils/server-r2';

const GMAIL_USER = process.env.GMAIL_USER || 'djflowerz254@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const SENDER_NAME = 'DJ Flowerz';
const SENDER_ALIAS = process.env.EMAIL_NOREPLY || 'noreply@djflowerz.co.ke';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
    },
});

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
        if (!Array.isArray(subscribers)) {
            subscribers = [];
        }

        // 2. Check if already subscribed
        if (subscribers.some((s: any) => s.email?.toLowerCase() === email.toLowerCase())) {
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

        // 4. Save back to R2
        await saveR2Collection('newsletter_subscribers', subscribers);

        // 5. Send Welcome Email
        if (GMAIL_APP_PASSWORD) {
            const html = `
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
            const subject = `Welcome to the DJ FLOWERZ Community! 🎧`;

            await transporter.sendMail({
                from: `"${SENDER_NAME}" <${GMAIL_USER}>`,
                replyTo: SENDER_ALIAS,
                to: email,
                subject,
                html,
            });
        } else {
            console.warn("Skipping welcome email: GMAIL_APP_PASSWORD is not set");
        }

        return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } catch (error: any) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Internal server error during subscription' });
    }
}
