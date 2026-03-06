export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, source = 'Website' } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    try {
        // Dynamic imports to bypass Vercel build issues with top-level imports in this project
        const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
        const nodemailer = await import("nodemailer");

        // R2 Credentials (fallback to VITE_ names)
        const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.VITE_STORAGE_ACCOUNT_ID;
        const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.VITE_STORAGE_ACCESS_KEY;
        const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_STORAGE_SECRET_KEY;
        const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.VITE_STORAGE_BUCKET || 'dj-flowerz';

        const GMAIL_USER = process.env.GMAIL_USER || 'djflowerz254@gmail.com';
        const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
        const SENDER_NAME = 'DJ Flowerz';
        const SENDER_ALIAS = process.env.EMAIL_NOREPLY || 'noreply@djflowerz.co.ke';

        const s3 = new S3Client({
            region: "auto",
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID || '',
                secretAccessKey: R2_SECRET_ACCESS_KEY || '',
            },
        });

        // 1. Get current subscribers from R2
        const key = 'data/newsletter_subscribers.json';
        let subscribers = [];
        try {
            const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
            const response = await s3.send(getCmd);
            const str = await response.Body?.transformToString();
            if (str) subscribers = JSON.parse(str);
        } catch (err) {
            if (err.name !== 'NoSuchKey') {
                console.error('R2 read error:', err);
                // Continue if empty or missing
            }
        }

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

        // 4. Save back to R2
        const putCmd = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(subscribers.slice(0, 10000)), // Limit to 10k for safety
            ContentType: 'application/json'
        });
        await s3.send(putCmd);

        // 5. Send Welcome Email
        if (GMAIL_APP_PASSWORD) {
            const transporter = nodemailer.default.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: GMAIL_USER,
                    pass: GMAIL_APP_PASSWORD,
                },
            });

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
            const subject = "Welcome to the DJ FLOWERZ Community! 🎧";

            await transporter.sendMail({
                from: `"${SENDER_NAME}" <${GMAIL_USER}>`,
                replyTo: SENDER_ALIAS,
                to: email,
                subject,
                html,
            });
        }

        return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
