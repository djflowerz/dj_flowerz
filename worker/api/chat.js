// worker/api/chat.js
// Live chat API - handles user chat sessions, messages, human escalation, and admin replies

import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { getAuthorizedUser } from '../utils/auth.js';

const ADMIN_WHATSAPP = '+254789783258';
const ADMIN_EMAIL = 'ianmuriithiflowerz@gmail.com';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/start  — create a new chat session
// ─────────────────────────────────────────────────────────────────────────────
async function startSession(request, env) {
    try {
        const { name, email } = await request.json().catch(() => ({}));
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(`
            INSERT INTO chat_sessions (id, visitor_name, visitor_email, status, created_at, updated_at)
            VALUES (?, ?, ?, 'bot', ?, ?)
        `).bind(id, name || 'Visitor', email || null, now, now).run();

        // Add a welcome bot message
        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'bot', ?, ?)
        `).bind(id, "👋 Hey! I'm the DJ Flowerz assistant. How can I help you today? Ask me about beats, bookings, subscriptions, or the music pool. You can also click **Speak to a Human** to connect with DJ Flowerz directly.", now).run();

        return Response.json({ success: true, sessionId: id });
    } catch (err) {
        console.error('[Chat] startSession error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/message — user sends a message
// ─────────────────────────────────────────────────────────────────────────────
async function sendMessage(request, env) {
    try {
        const { sessionId, text } = await request.json();

        if (!sessionId || !text?.trim()) {
            return Response.json({ error: 'sessionId and text are required' }, { status: 400 });
        }

        const session = await env.DB.prepare(
            `SELECT * FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        const now = new Date().toISOString();

        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'user', ?, ?)
        `).bind(sessionId, text.trim(), now).run();

        // Touch updated_at
        await env.DB.prepare(`
            UPDATE chat_sessions SET updated_at = ? WHERE id = ?
        `).bind(now, sessionId).run();

        // If session is already in 'human' mode, notify admin via WhatsApp that user replied
        if (session.status === 'human' && session.whatsapp_notified) {
            const msg = `💬 *DJ Flowerz Chat*\n${session.visitor_name || 'User'}: ${text.trim()}\n\nReply to this WhatsApp message to respond, or open Admin Panel: https://djflowerz.co.ke/admin`;
            await sendWhatsApp(ADMIN_WHATSAPP, msg, env);
        }

        // Simple bot auto-responses (only in 'bot' mode)
        if (session.status === 'bot') {
            const botReply = getBotReply(text);
            if (botReply) {
                await env.DB.prepare(`
                    INSERT INTO chat_messages (session_id, sender, text, created_at)
                    VALUES (?, 'bot', ?, ?)
                `).bind(sessionId, botReply, new Date().toISOString()).run();
            }
        }

        return Response.json({ success: true });
    } catch (err) {
        console.error('[Chat] sendMessage error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/session/:id — poll messages for a session
// ─────────────────────────────────────────────────────────────────────────────
async function getSession(request, env, params) {
    try {
        const sessionId = params.id;

        const session = await env.DB.prepare(
            `SELECT id, visitor_name, visitor_email, status, created_at FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        const url = new URL(request.url);
        const since = url.searchParams.get('since'); // ISO timestamp for incremental fetch

        let query = `SELECT id, sender, text, created_at FROM chat_messages WHERE session_id = ?`;
        const bindings = [sessionId];

        if (since) {
            query += ` AND created_at > ?`;
            bindings.push(since);
        }

        query += ` ORDER BY created_at ASC`;

        const { results } = await env.DB.prepare(query).bind(...bindings).all();

        return Response.json({ session, messages: results || [] });
    } catch (err) {
        console.error('[Chat] getSession error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/human — user requests a human agent
// ─────────────────────────────────────────────────────────────────────────────
async function requestHuman(request, env) {
    try {
        const { sessionId } = await request.json();

        if (!sessionId) {
            return Response.json({ error: 'sessionId is required' }, { status: 400 });
        }

        const session = await env.DB.prepare(
            `SELECT * FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.status === 'human') {
            return Response.json({ success: true, alreadyEscalated: true });
        }

        const now = new Date().toISOString();

        // Update status to 'human'
        await env.DB.prepare(`
            UPDATE chat_sessions SET status = 'human', updated_at = ? WHERE id = ?
        `).bind(now, sessionId).run();

        // Add a system message in the chat
        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'bot', ?, ?)
        `).bind(
            sessionId,
            "✅ Got it! I've notified DJ Flowerz. You'll get a reply here shortly, or via WhatsApp if you provided your number. Please hold on!",
            now
        ).run();

        // Get transcript of last 10 messages
        const { results: transcript } = await env.DB.prepare(`
            SELECT sender, text, created_at FROM chat_messages
            WHERE session_id = ? ORDER BY created_at DESC LIMIT 10
        `).bind(sessionId).all();
        const transcriptText = (transcript || []).reverse()
            .map(m => `[${m.sender.toUpperCase()}] ${m.text}`)
            .join('\n');

        const visitorName = session.visitor_name || 'A visitor';
        const visitorEmail = session.visitor_email || 'No email provided';

        // ── WhatsApp notification to admin ──
        const waMsg = `🆕 *Live Chat – Human Agent Requested*\n\n👤 *Name:* ${visitorName}\n📧 *Email:* ${visitorEmail}\n🔗 *Session:* ${sessionId}\n\n📝 *Recent Chat:*\n${transcriptText}\n\n─────\nReply to this message to respond to the user.\nOr open Admin Panel: https://djflowerz.co.ke/admin`;

        const waOk = await sendWhatsApp(ADMIN_WHATSAPP, waMsg, env);

        if (waOk) {
            await env.DB.prepare(`
                UPDATE chat_sessions SET whatsapp_notified = 1, admin_whatsapp = ?, updated_at = ? WHERE id = ?
            `).bind(ADMIN_WHATSAPP, now, sessionId).run();
        }

        // ── Email notification to admin ──
        const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:24px;border-radius:12px;">
          <h2 style="color:#e91e8c;margin:0 0 16px">🎧 Live Chat – Human Agent Requested</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:6px;color:#aaa;width:100px">Name</td><td style="padding:6px;font-weight:600">${visitorName}</td></tr>
            <tr><td style="padding:6px;color:#aaa">Email</td><td style="padding:6px">${visitorEmail}</td></tr>
            <tr><td style="padding:6px;color:#aaa">Session ID</td><td style="padding:6px;font-size:11px;color:#888">${sessionId}</td></tr>
          </table>
          <h3 style="color:#e91e8c;margin:0 0 8px">Recent Conversation</h3>
          <div style="background:#1a1a1a;padding:16px;border-radius:8px;font-size:13px;line-height:1.8;">
            ${transcriptText.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top:24px;text-align:center;">
            <a href="https://djflowerz.co.ke/admin" style="display:inline-block;background:#e91e8c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Open Admin Panel →</a>
          </div>
        </div>`;

        const emailOk = await sendEmail({
            to: ADMIN_EMAIL,
            subject: `💬 Live Chat: ${visitorName} needs help`,
            html: emailHtml,
            text: `Live Chat – Human Agent Requested\n\nName: ${visitorName}\nEmail: ${visitorEmail}\n\nRecent chat:\n${transcriptText}`,
            fromName: 'DJ Flowerz Chat',
        }, env);

        if (emailOk) {
            await env.DB.prepare(`
                UPDATE chat_sessions SET email_notified = 1, updated_at = ? WHERE id = ?
            `).bind(now, sessionId).run();
        }

        return Response.json({ success: true, whatsappSent: waOk, emailSent: emailOk });
    } catch (err) {
        console.error('[Chat] requestHuman error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/reply — admin sends a reply to a session (from admin panel)
// ─────────────────────────────────────────────────────────────────────────────
async function adminReply(request, env) {
    try {
        // Allow reply via admin auth OR a secret key (for flexibility)
        const authHeader = request.headers.get('Authorization') || '';
        const secret = env.CHAT_REPLY_SECRET;
        const isSecretAuth = secret && authHeader === `Bearer ${secret}`;

        if (!isSecretAuth) {
            const user = await getAuthorizedUser(request, env);
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const { sessionId, text } = await request.json();

        if (!sessionId || !text?.trim()) {
            return Response.json({ error: 'sessionId and text are required' }, { status: 400 });
        }

        const session = await env.DB.prepare(
            `SELECT * FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        const now = new Date().toISOString();

        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'agent', ?, ?)
        `).bind(sessionId, text.trim(), now).run();

        await env.DB.prepare(`
            UPDATE chat_sessions SET status = 'human', updated_at = ? WHERE id = ?
        `).bind(now, sessionId).run();

        return Response.json({ success: true });
    } catch (err) {
        console.error('[Chat] adminReply error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/chat/sessions — list all sessions (admin only)
// ─────────────────────────────────────────────────────────────────────────────
async function listSessions(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { results } = await env.DB.prepare(`
            SELECT
                cs.id,
                cs.visitor_name,
                cs.visitor_email,
                cs.status,
                cs.whatsapp_notified,
                cs.email_notified,
                cs.created_at,
                cs.updated_at,
                (SELECT text FROM chat_messages WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id) AS message_count
            FROM chat_sessions cs
            ORDER BY cs.updated_at DESC
            LIMIT 100
        `).all();

        return Response.json(results || []);
    } catch (err) {
        console.error('[Chat] listSessions error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/whatsapp — incoming WhatsApp reply from admin (Twilio webhook)
// ─────────────────────────────────────────────────────────────────────────────
async function handleWhatsAppWebhook(request, env) {
    try {
        // Twilio sends form-encoded data
        const formData = await request.formData();
        const from  = formData.get('From') || '';   // e.g. "whatsapp:+254789783258"
        const body  = (formData.get('Body') || '').trim();

        if (!body) {
            return new Response('OK', { status: 200 });
        }

        // Only process messages from the admin WhatsApp number
        const adminNum = ADMIN_WHATSAPP.replace(/\D/g, '');
        const fromNum  = from.replace(/\D/g, '');

        if (!fromNum.endsWith(adminNum) && !adminNum.endsWith(fromNum)) {
            console.log('[WhatsApp Webhook] Ignoring message from non-admin:', from);
            return new Response('OK', { status: 200 });
        }

        // Check if the body starts with a session ID pattern
        // Convention: admin can prefix reply with session ID like: [abc-uuid] My reply here
        // OR we post to the most recently active human session
        let sessionId = null;
        let replyText = body;

        const sessionMatch = body.match(/^\[([a-f0-9\-]{36})\]\s*([\s\S]+)$/i);
        if (sessionMatch) {
            sessionId = sessionMatch[1];
            replyText = sessionMatch[2].trim();
        } else {
            // Find most recent active 'human' session that was notified via this WhatsApp
            const session = await env.DB.prepare(`
                SELECT id FROM chat_sessions
                WHERE status = 'human' AND admin_whatsapp = ?
                ORDER BY updated_at DESC
                LIMIT 1
            `).bind(ADMIN_WHATSAPP).first();
            sessionId = session?.id || null;
        }

        if (!sessionId) {
            console.log('[WhatsApp Webhook] No active session found for reply');
            return new Response('OK', { status: 200 });
        }

        const now = new Date().toISOString();
        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'agent', ?, ?)
        `).bind(sessionId, replyText, now).run();

        await env.DB.prepare(`
            UPDATE chat_sessions SET updated_at = ? WHERE id = ?
        `).bind(now, sessionId).run();

        console.log('[WhatsApp Webhook] Admin reply routed to session', sessionId);
        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('[WhatsApp Webhook] Error:', err);
        return new Response('Error', { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/chat/sessions/:id — close or reopen a session
// ─────────────────────────────────────────────────────────────────────────────
async function updateSession(request, env, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { status } = await request.json();
        const now = new Date().toISOString();
        await env.DB.prepare(`
            UPDATE chat_sessions SET status = ?, updated_at = ? WHERE id = ?
        `).bind(status, now, params.id).run();
        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple keyword bot
// ─────────────────────────────────────────────────────────────────────────────
function getBotReply(text) {
    const t = text.toLowerCase();

    if (/\b(hi|hello|hey|hola|habari|niaje)\b/.test(t)) {
        return "Hey there! 👋 Ask me anything about beats, bookings, the Music Pool, or subscriptions. Or click **Speak to a Human** to chat directly with DJ Flowerz!";
    }
    if (/\b(beat|beats|instrumental|type beat)\b/.test(t)) {
        return "🎵 DJ Flowerz has a huge collection of beats! Check out the Store at https://djflowerz.co.ke or drop your WhatsApp for a custom session.";
    }
    if (/\b(book|booking|gig|event|wedding|club|corporate)\b/.test(t)) {
        return "🎤 For bookings and gigs, use the Bookings page at https://djflowerz.co.ke/bookings — or click **Speak to a Human** and I'll connect you directly!";
    }
    if (/\b(studio|record|recording)\b/.test(t)) {
        return "🎚️ The DJ Flowerz studio is available for sessions! Head to https://djflowerz.co.ke/bookings to schedule your studio time.";
    }
    if (/\b(music pool|pool|tracks|download)\b/.test(t)) {
        return "🎧 The Music Pool has thousands of tracks across genres. Subscribe at https://djflowerz.co.ke to get full access!";
    }
    if (/\b(subscri|plan|price|cost|how much|bei)\b/.test(t)) {
        return "💰 Subscription plans start from as low as KES 499/week. Check https://djflowerz.co.ke for the latest offers!";
    }
    if (/\b(pay|payment|mpesa|paystack)\b/.test(t)) {
        return "💳 We accept M-Pesa and card payments via Paystack. Super secure and instant!";
    }
    if (/\b(human|person|agent|real|admin|help|support)\b/.test(t)) {
        return null; // Let the UI handle this via the "Speak to Human" button hint
    }

    return null; // No bot reply — stay silent
}

// ─────────────────────────────────────────────────────────────────────────────
// Main route handler
// ─────────────────────────────────────────────────────────────────────────────
export async function handleChat(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'POST' && path === '/api/chat/start')   return startSession(request, env);
    if (method === 'POST' && path === '/api/chat/message') return sendMessage(request, env);
    if (method === 'POST' && path === '/api/chat/human')   return requestHuman(request, env);
    if (method === 'POST' && path === '/api/chat/reply')   return adminReply(request, env);
    if (method === 'GET'  && path.startsWith('/api/chat/session/')) return getSession(request, env, params);
    if (method === 'GET'  && path === '/api/admin/chat/sessions') return listSessions(request, env);
    if (method === 'PATCH' && path.startsWith('/api/admin/chat/sessions/')) return updateSession(request, env, params);
    if (method === 'POST'  && path === '/api/webhooks/whatsapp')  return handleWhatsAppWebhook(request, env);

    return Response.json({ error: 'Not Found' }, { status: 404 });
}
