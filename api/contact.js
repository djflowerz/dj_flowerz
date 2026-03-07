export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { name, email, subject, message, source = 'web' } = req.body;

    if (!email || !message) {
        return res.status(400).json({ error: 'Email and message are required' });
    }

    try {
        // Dynamic imports to bypass Vercel build issues
        const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
        const nodemailer = await import("nodemailer");

        // R2 Credentials - Trimmed to prevent header errors
        const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || process.env.VITE_STORAGE_ACCOUNT_ID || '').trim();
        const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || process.env.VITE_STORAGE_ACCESS_KEY || '').trim();
        const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_STORAGE_SECRET_KEY || '').trim();
        const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || process.env.VITE_STORAGE_BUCKET || 'dj-flowerz').trim();

        const GMAIL_USER = (process.env.GMAIL_USER || 'djflowerz254@gmail.com').trim();
        const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').trim();
        const SENDER_NAME = 'DJ Flowerz Website';

        const s3 = new S3Client({
            region: "auto",
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });

        // 1. Save to R2
        const key = 'data/contact_messages.json';
        let messages = [];
        try {
            const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
            const response = await s3.send(getCmd);
            const str = await response.Body?.transformToString();
            if (str) messages = JSON.parse(str);
        } catch (err) {
            if (err.name !== 'NoSuchKey') console.error('R2 read error:', err);
        }

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

        messages.unshift(newMessage);

        const putCmd = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(messages.slice(0, 5000)),
            ContentType: 'application/json'
        });
        await s3.send(putCmd);

        // 2. Notify Admin
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

            await transporter.sendMail({
                from: `"${SENDER_NAME}" <${GMAIL_USER}>`,
                to: GMAIL_USER, // Send to admin
                subject: `New Message: ${subject} from ${name}`,
                html: adminHtml,
            });
        }

        return res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
