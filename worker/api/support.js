// worker/api/support.js
import { sendEmail } from '../utils/email.js';
import { templates } from '../utils/templates.js';

import { getAuthorizedUser } from '../utils/auth.js';

export async function handleSupport(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;

    // PUBLIC: Submit a contact message (ticket)
    if (method === 'POST') {
        try {
            const { name, email, phone, subject, message, source } = await request.json();
            const id = crypto.randomUUID();

            if (!email || !message) {
                return Response.json({ error: 'Email and message are required' }, { status: 400 });
            }

            await env.DB.prepare(`
                INSERT INTO support_tickets (id, customer_name, customer_email, customer_phone, subject, message_content, source, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, name, email, phone, subject, message, source || 'web', 'pending').run();

            // 1. Send Confirmation to User
            ctx.waitUntil(sendEmail({
                to: email,
                subject: 'Message Received: ' + (subject || 'Support Request'),
                html: templates.supportConfirmation(name || 'Legend', subject || 'Support Inquiry'),
                text: `Hello, thanks for reaching out. We've received your message: "${subject || 'Support Inquiry'}". We'll get back to you soon.`
            }, env));

            // 2. Send Alert to Admin
            ctx.waitUntil(sendEmail({
                to: env.GMAIL_USER || 'admin@djflowerz.co.ke',
                subject: '🚨 New Support Message!',
                html: templates.adminAlert('New Support Ticket', [
                    ['From', name || 'Unknown'],
                    ['Email', email],
                    ['Subject', subject || 'None'],
                    ['Source', source || 'Web']
                ]),
                text: `New Support Message from ${name} (${email}): ${subject}`
            }, env));

            return Response.json({ success: true, id });
        } catch (err) {
            console.error('[Support POST Error]', err);
            return Response.json({ error: err.message }, { status: 500 });
        }
    }

    // ADMIN ONLY: Management
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (method === 'GET') {
            const { results } = await env.DB.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC`).all();
            return Response.json(results || []);
        }

        if (method === 'PATCH') {
            const body = await request.json();
            const id = url.pathname.split('/').pop();
            const { status, admin_notes } = body;

            await env.DB.prepare(`
                UPDATE support_tickets SET status = ?, admin_notes = ? WHERE id = ?
            `).bind(status, admin_notes, id).run();

            return Response.json({ success: true });
        }

        return Response.json({ error: 'Not Found' }, { status: 404 });
    } catch (err) {
        console.error('[Support API Error]', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
