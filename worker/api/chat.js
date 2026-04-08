// worker/api/chat.js
// Live chat API - handles user chat sessions, messages, human escalation, and admin replies

import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { getAuthorizedUser } from '../utils/auth.js';

const ADMIN_WHATSAPP = '+254789783258';
const ADMIN_EMAIL = 'admin@djflowerz.co.ke';

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
        const { sessionId, text, fileUrl, fileType, whatsappNumber } = await request.json();

        if (!sessionId || (!text?.trim() && !fileUrl)) {
            return Response.json({ error: 'sessionId and content are required' }, { status: 400 });
        }

        const session = await env.DB.prepare(
            `SELECT * FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        const now = new Date().toISOString();

        // Update WhatsApp number if provided
        if (whatsappNumber) {
            await env.DB.prepare(`UPDATE chat_sessions SET whatsapp_number = ? WHERE id = ?`).bind(whatsappNumber, sessionId).run();
        }

        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, file_url, file_type, created_at)
            VALUES (?, 'user', ?, ?, ?, ?)
        `).bind(sessionId, text?.trim() || '', fileUrl || null, fileType || null, now).run();

        // Touch updated_at
        await env.DB.prepare(`
            UPDATE chat_sessions SET updated_at = ? WHERE id = ?
        `).bind(now, sessionId).run();

        // If session is already in 'human' mode, notify admin via WhatsApp that user replied
        if (session.status === 'human' && session.whatsapp_notified) {
            let msg = `💬 *DJ Flowerz Chat*\n${session.visitor_name || 'User'}: ${text?.trim() || '(Attachment)'}`;
            if (fileUrl) msg += `\n📎 Attachment: ${fileUrl}`;
            msg += `\n\nReply to this WhatsApp message to respond, or open Admin Panel: https://djflowerz.co.ke/admin`;
            
            await sendWhatsApp(ADMIN_WHATSAPP, msg, env);
        }

        // Upgrade to AI Support Bot (only in 'bot' mode)
        if (session.status === 'bot') {
            const botReply = await getAiReply(text || '', sessionId, env);
            if (botReply) {
                const botNow = new Date().toISOString();
                await env.DB.prepare(`
                    INSERT INTO chat_messages (session_id, sender, text, created_at)
                    VALUES (?, 'bot', ?, ?)
                `).bind(sessionId, botReply, botNow).run();
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
            `SELECT * FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        const now = new Date();
        const isoNow = now.toISOString();

        // ── SLA CHECK (60s) ──
        if (session.status === 'human' && 
            session.human_requested_at && 
            !session.last_agent_response_at && 
            !session.sla_failed_notified) {
            
            const requestedAt = new Date(session.human_requested_at);
            const diffSec = (now.getTime() - requestedAt.getTime()) / 1000;

            if (diffSec > 60) {
                const ticketID = `FLW-${sessionId.substring(0,6).toUpperCase()}`;
                const slaMsg = `⚠️ **Agent Status: Busy**\n\nAll our agents are currently assisting other users. We've created a priority ticket for you: **#${ticketID}**.\n\nWe will reach out to you as soon as possible via this chat or your provided contact methods. In the meantime, feel free to leave more details about your request!`;
                
                await env.DB.prepare(`
                    INSERT INTO chat_messages (session_id, sender, text, created_at)
                    VALUES (?, 'bot', ?, ?)
                `).bind(sessionId, slaMsg, isoNow).run();

                await env.DB.prepare(`
                    UPDATE chat_sessions SET sla_failed_notified = 1, updated_at = ? WHERE id = ?
                `).bind(isoNow, sessionId).run();
            }
        }

        const url = new URL(request.url);
        const since = url.searchParams.get('since'); // ISO timestamp for incremental fetch

        let query = `SELECT id, sender, text, file_url, file_type, created_at FROM chat_messages WHERE session_id = ?`;
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

        // Update status to 'human' and track requested time
        await env.DB.prepare(`
            UPDATE chat_sessions 
            SET status = 'human', human_requested_at = ?, last_agent_response_at = NULL, sla_failed_notified = 0, updated_at = ? 
            WHERE id = ?
        `).bind(now, now, sessionId).run();

        // Add a system message in the chat
        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'bot', ?, ?)
        `).bind(
            sessionId,
            "✅ Got it! I've notified DJ Flowerz. You'll get a reply here shortly! If you have a WhatsApp number you'd like us to reach out on, please type it below.",
            now
        ).run();

        // Get transcript of last 10 messages
        const { results: transcript } = await env.DB.prepare(`
            SELECT sender, text FROM chat_messages
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

        await sendEmail({
            to: ADMIN_EMAIL,
            subject: `💬 Live Chat: ${visitorName} needs help`,
            html: emailHtml,
            text: `Live Chat – Human Agent Requested\n\nName: ${visitorName}\nEmail: ${visitorEmail}\n\nRecent chat:\n${transcriptText}`,
            fromName: 'DJ Flowerz Chat',
        }, env).catch(e => console.error('Email failed:', e));

        return Response.json({ success: true, whatsappSent: waOk });
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
        const user = await getAuthorizedUser(request, env);
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId, text } = await request.json();

        if (!sessionId || !text?.trim()) {
            return Response.json({ error: 'sessionId and text are required' }, { status: 400 });
        }

        const now = new Date().toISOString();

        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'agent', ?, ?)
        `).bind(sessionId, text.trim(), now).run();

        await env.DB.prepare(`
            UPDATE chat_sessions SET status = 'human', last_agent_response_at = ?, updated_at = ? WHERE id = ?
        `).bind(now, now, sessionId).run();

        return Response.json({ success: true });
    } catch (err) {
        console.error('[Chat] adminReply error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/return-to-bot — mark session as 'bot' again
// ─────────────────────────────────────────────────────────────────────────────
async function returnToBot(request, env) {
    try {
        const { sessionId } = await request.json();
        const now = new Date().toISOString();
        await env.DB.prepare(`
            UPDATE chat_sessions SET status = 'bot', updated_at = ? WHERE id = ?
        `).bind(now, sessionId).run();
        
        await env.DB.prepare(`
            INSERT INTO chat_messages (session_id, sender, text, created_at)
            VALUES (?, 'bot', ?, ?)
        `).bind(sessionId, "🤖 AI Assistant re-engaged. How can I help you now?", now).run();

        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/close — close a session
// ─────────────────────────────────────────────────────────────────────────────
async function closeSession(request, env) {
    try {
        const { sessionId } = await request.json();
        const now = new Date().toISOString();
        await env.DB.prepare(`
            UPDATE chat_sessions SET status = 'closed', updated_at = ? WHERE id = ?
        `).bind(now, sessionId).run();
        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Support Bot Logic
// ─────────────────────────────────────────────────────────────────────────────
async function getAiReply(userText, sessionId, env) {
    if (!env.AI) return "I'm having a technical issue. Please click 'Speak to a Human'!";

    try {
        // Fetch user's subscription status if session has email
        const session = await env.DB.prepare("SELECT visitor_email FROM chat_sessions WHERE id = ?").bind(sessionId).first();
        let subscriptionStatus = "Not logged in / No email provided";
        if (session?.visitor_email) {
            const nowIso = new Date().toISOString();
            const sub = await env.DB.prepare(`
                SELECT s.*, p.name as plan_name 
                FROM subscriptions s
                JOIN subscription_plans p ON s.plan_id = p.id
                WHERE s.user_email = ? AND s.status = 'active' AND s.current_period_end > ?
                ORDER BY s.current_period_end DESC LIMIT 1
            `).bind(session.visitor_email, nowIso).first();
            
            if (sub) {
                subscriptionStatus = `ACTIVE: ${sub.plan_name} (Expires: ${new Date(sub.current_period_end).toLocaleDateString()})`;
            } else {
                // Check if they HAVE an expired one
                const expiredSub = await env.DB.prepare(`
                    SELECT s.*, p.name as plan_name 
                    FROM subscriptions s
                    JOIN subscription_plans p ON s.plan_id = p.id
                    WHERE s.user_email = ?
                    ORDER BY s.current_period_end DESC LIMIT 1
                `).bind(session.visitor_email).first();
                
                if (expiredSub) {
                    subscriptionStatus = `EXPIRED: ${expiredSub.plan_name} (Ended on: ${new Date(expiredSub.current_period_end).toLocaleDateString()}). Tell them to renew at https://djflowerz.co.ke/checkout`;
                } else {
                    subscriptionStatus = "No subscription found. Suggest they join the Music Pool!";
                }
            }
        }

        const contextStr = `
        USER SUBSCRIPTION STATUS: ${subscriptionStatus}

        ACTIVE SUBSCRIPTION PLANS (Available for purchase):
        ${plans.map(p => `- ${p.name}: KES ${p.price} for ${p.duration_days} days`).join('\n')}
        
        FEATURED PRODUCTS:
        ${products.map(p => `- ${p.name}: KES ${p.price}`).join('\n')}
        `;

        // Get recent context (last 5 messages)
        const { results: history } = await env.DB.prepare(`
            SELECT sender, text FROM chat_messages 
            WHERE session_id = ? ORDER BY created_at DESC LIMIT 5
        `).bind(sessionId).all();

        const messages = [
            {
                role: 'system',
                content: `You are the DJ Flowerz AI Assistant. You help users with EVERYTHING on djflowerz.co.ke. 
                
                REAL-TIME DATA:
                ${contextStr}
                
                KNOWLEDGE BASE:
                1. LINKS: ALWAYS providing clickable links for checkout: https://djflowerz.co.ke/checkout, music pool: https://djflowerz.co.ke/music-pool, and store: https://djflowerz.co.ke/store.
                2. PAYMENTS: Use Paystack for M-Pesa & Cards. If payment fails, ask for name/email/ref.
                3. WHATSAPP: If user hasn't provided a WhatsApp number but wants admin to call back, ask for it!
                4. EMAIL: Official support email is admin@djflowerz.co.ke.
                5. HUMAN ESCALATION: If user is frustrated or asks for a person, guide them to use "Speak to a Human".
                
                CORE BEHAVIOR:
                - Use [Link Text](URL) format for links.
                - Be concise (max 3 sentences).
                - Use natural Kenyan English (mixed with Sheng if it feels right, but remain professional).`
            },
            ...(history || []).reverse().map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            })),
            { role: 'user', content: userText }
        ];

        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages, max_tokens: 256 });
        return response.response;
    } catch (err) {
        console.error('[Chat] AI generation failed:', err);
        return "I'm busy synchronizing! Use 'Speak to a Human' for urgent help.";
    }
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
    if (method === 'POST' && path === '/api/chat/return-to-bot') return returnToBot(request, env);
    if (method === 'POST' && path === '/api/chat/close')   return closeSession(request, env);
    if (method === 'GET'  && path.startsWith('/api/chat/session/')) return getSession(request, env, params);
    if (method === 'GET'  && path === '/api/admin/chat/sessions') return listSessions(request, env);
    if (method === 'PATCH' && path.startsWith('/api/admin/chat/sessions/')) return updateSession(request, env, params);
    if (method === 'POST'  && path === '/api/webhooks/whatsapp')  return handleWhatsAppWebhook(request, env);

    return Response.json({ error: 'Not Found' }, { status: 404 });
}

// Existing admin helper functions (listSessions, handleWhatsAppWebhook, updateSession) follow...
// (Keep them as they were but with the proper logic for the expanded schema if needed)
