/**
 * api/newsletter/send.ts
 * Sends a newsletter campaign to a list of subscribers.
 * Uses Gmail SMTP (djflowerz254@gmail.com) via nodemailer.
 * Admin-only endpoint protected by Supabase auth.
 */
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const GMAIL_USER = process.env.GMAIL_USER || 'djflowerz254@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const SENDER_NAME = 'DJ Flowerz';
const SENDER_ALIAS = process.env.EMAIL_NOREPLY || 'noreply@djflowerz.co.ke'; // Cloudflare routed alias

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

    // --- AUTH GUARD (admin only) ---
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const isAdmin =
            user.user_metadata?.role === 'admin' ||
            user.email === (process.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com') ||
            user.email === 'djflowerz254@gmail.com';

        if (!isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
    } catch {
        return res.status(500).json({ error: 'Auth verification failed' });
    }
    // --- END AUTH GUARD ---

    const { subject, html, subscribers } = req.body;

    if (!subject || !html) {
        return res.status(400).json({ error: 'Missing subject or html body' });
    }

    if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return res.status(400).json({ error: 'No subscribers provided' });
    }

    if (!GMAIL_APP_PASSWORD) {
        return res.status(500).json({ error: 'Gmail App Password not configured. Set GMAIL_APP_PASSWORD env var.' });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const email of subscribers) {
        if (!email || typeof email !== 'string') continue;
        try {
            await transporter.sendMail({
                from: `"${SENDER_NAME}" <${GMAIL_USER}>`,
                replyTo: SENDER_ALIAS,
                to: email,
                subject,
                html,
            });
            sent++;
        } catch (err: any) {
            console.error(`Failed to send to ${email}:`, err.message);
            errors.push(`${email}: ${err.message}`);
        }
    }

    return res.status(200).json({
        success: true,
        message: `Sent to ${sent}/${subscribers.length} subscribers`,
        errors: errors.length > 0 ? errors : undefined,
    });
}
