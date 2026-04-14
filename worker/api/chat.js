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
        const url = new URL(request.url);
        const sessionId = params?.id || url.pathname.split('/').pop();
        
        console.log(`[Chat] getSession: id=${sessionId}, params.id=${params?.id}, path=${url.pathname}`);

        const session = await env.DB.prepare(
            `SELECT * FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (!session) {
            console.warn(`[Chat] Session not found: ${sessionId}`);
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
            try {
                const nowIso = new Date().toISOString();
                const sub = await env.DB.prepare(`
                    SELECT s.*, p.name as plan_name 
                    FROM subscriptions s
                    JOIN subscription_plans p ON s.plan_id = p.id
                    WHERE s.user_email = ? AND s.status = 'active' AND s.expires_at > ?
                    ORDER BY s.expires_at DESC LIMIT 1
                `).bind(session.visitor_email, nowIso).first();
                
                if (sub) {
                    subscriptionStatus = `ACTIVE: ${sub.plan_name} (Expires: ${new Date(sub.expires_at).toLocaleDateString()})`;
                } else {
                    // Check if they HAVE an expired one
                    const expiredSub = await env.DB.prepare(`
                        SELECT s.*, p.name as plan_name 
                        FROM subscriptions s
                        JOIN subscription_plans p ON s.plan_id = p.id
                        WHERE s.user_email = ?
                        ORDER BY s.expires_at DESC LIMIT 1
                    `).bind(session.visitor_email).first();
                    
                    if (expiredSub) {
                        subscriptionStatus = `EXPIRED: ${expiredSub.plan_name} (Ended on: ${new Date(expiredSub.expires_at).toLocaleDateString()}). Tell them to renew at https://djflowerz.co.ke/checkout`;
                    } else {
                        subscriptionStatus = "No subscription found. Suggest they join the Music Pool!";
                    }
                }
            } catch (subErr) {
                console.error('[Chat] Subscription check failed:', subErr);
                subscriptionStatus = "Error checking subscription (server limit)";
            }
        }

        // Fetch live plans and products from DB
        let plansText = 'Visit https://djflowerz.co.ke/checkout for current plans.';
        let productsText = 'Visit https://djflowerz.co.ke/store for current products.';
        
        try {
            // Safer query: Fetch all and filter in JS to avoid "no such column" errors
            const { results: plansData } = await env.DB.prepare(
                `SELECT * FROM subscription_plans LIMIT 20`
            ).all();
            
            if (plansData && plansData.length > 0) {
                // Filter for active plans (handle missing is_active column gracefully)
                const activePlans = plansData.filter(p => p.is_active === undefined || p.is_active === 1 || p.is_active === true);
                if (activePlans.length > 0) {
                    plansText = activePlans.map(p => `- ${p.name}: KES ${p.price}${p.duration_days ? ` for ${p.duration_days} days` : ''}`).join('\n');
                }
            }
        } catch (e) {
            console.error('[Chat] Failed to fetch plans context:', e);
        }

        try {
            const { results: productsData } = await env.DB.prepare(
                `SELECT * FROM products ORDER BY created_at DESC LIMIT 10`
            ).all();
            
            if (productsData && productsData.length > 0) {
                // Filter for active products
                const activeProducts = productsData.filter(p => 
                    p.active === 1 || p.is_active === 1 || p.active === true || p.is_active === true || 
                    (p.active === undefined && p.is_active === undefined)
                );
                if (activeProducts.length > 0) {
                    productsText = activeProducts.map(p => `- ${p.name}: KES ${p.price}`).join('\n');
                }
            }
        } catch (e) {
            console.error('[Chat] Failed to fetch products context:', e);
        }

        const currentDate = new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const contextStr = `
        CURRENT DATE: ${currentDate}
        USER SUBSCRIPTION STATUS (Based on chat session email): ${subscriptionStatus}

        ACTIVE SUBSCRIPTION PLANS (Available for purchase):
        ${plansText}
        
        FEATURED PRODUCTS:
        ${productsText}
        `;

        // Get expanded recent context (last 15 messages for better continuity)
        const { results: history } = await env.DB.prepare(`
            SELECT sender, text FROM chat_messages 
            WHERE session_id = ? ORDER BY created_at DESC LIMIT 15
        `).bind(sessionId).all();

        const messages = [
            {
                role: 'system',
                content: `You are DJ Flowerz's AI Executive Assistant. Your primary goal is to provide a premium client experience while maximizing sales and lead quality.

                CURRENT CONTEXT:
                - DATE/TIME: ${currentDate}
                - TIMEZONE: East Africa Time (EAT) / Nairobi
                - LOCATION: Nairobi, Kenya
                - USER STATUS: ${subscriptionStatus}

                REAL-TIME CATALOG:
                ACTIVE PLANS:
                ${plansText}
                
                TOP PRODUCTS:
                ${productsText}

                YOUR CORE RESPONSIBILITIES (IN ORDER OF PRIORITY):
                1. SALES CONVERSION: Proactively suggest the Music Pool or Store products. If a user asks about pricing, explain the value of the Weekly (KES 200) or Monthly (KES 700) plans. Always use Markdown for links: [Browse Music Pool](https://djflowerz.co.ke/music-pool).
                
                2. LEAD QUALIFICATION: If a user wants to BOOK a Gig or Studio session, you MUST gather details before escalating:
                   - GIGS: Ask for Date, Type (Wedding, Club, Corporate), Location, and Duration.
                   - STUDIO: Ask for Genre, Number of Artists, and Preferred Time (Mon-Thu 10am-6pm).
                   - Only guide them to "Speak to a Human" AFTER you have extracted at least 2 of these details.
                
                3. SOFT-BOOKING: If they suggest a time, acknowledge it relative to Nairobi business hours. Say: "I've noted your interest for [Date/Time]. I'll pass this straight to DJ Flowerz so he can confirm the slot for you."
                
                4. SUPPORT & RECEIPTS: Analyze paste-in receipts. If the payment date was more than 24h ago for a daily pass, explicitly tell them it has EXPIRED and provide the [Renew Link](https://djflowerz.co.ke/checkout).
                
                5. ESCALATION: Use the "Speak to a Human" button as a fallback. For inquiries outside your remit, ask for their WhatsApp number so DJ Flowerz can reach out directly.

                TONE & BRANDING:
                - Professional, enthusiastic, and "Finnesse" (smooth).
                - Use Kenyan English/Sheng naturally (e.g., "Sasa!", "Karibu sana").
                - Refer to the business globally as "us" or "our team".
                - Keep responses concise but information-dense. Facilitate the sale at every turn.`
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

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Webhook Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

async function listSessions(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch sessions joined with the latest message
        const { results } = await env.DB.prepare(`
            SELECT 
                s.*,
                (SELECT text FROM chat_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM chat_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
                (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id AND sender = 'user' AND created_at > s.last_agent_response_at) as unread_count
            FROM chat_sessions s
            ORDER BY s.updated_at DESC
            LIMIT 100
        `).all();

        return Response.json(results || []);
    } catch (err) {
        console.error('[Chat] listSessions error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

async function updateSession(request, env, params) {
    try {
        const user = await getAuthorizedUser(request, env);
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const id = params?.id || url.pathname.split('/').pop();
        const body = await request.json();

        const fields = [];
        const values = [];

        if (body.status) {
            fields.push('status = ?');
            values.push(body.status);
        }
        if (body.visitor_name) {
            fields.push('visitor_name = ?');
            values.push(body.visitor_name);
        }

        if (fields.length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 });

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        await env.DB.prepare(`
            UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?
        `).bind(...values).run();

        return Response.json({ success: true });
    } catch (err) {
        console.error('[Chat] updateSession error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

async function handleWhatsAppWebhook(request, env) {
    // This handles incoming messages from Twilio/WhatsApp
    // Twilio sends Form Data (x-www-form-urlencoded)
    try {
        const formData = await request.formData();
        const from = formData.get('From'); // e.g., 'whatsapp:+254...'
        const body = formData.get('Body');
        const mediaUrl = formData.get('MediaUrl0');
        const now = new Date().toISOString();

        console.log(`[WhatsApp] Incoming from ${from}: ${body}`);

        // Check if this is the admin replying
        if (from === ADMIN_WHATSAPP) {
            // Need to find which session they are replying to. 
            // Usually, Twilio sends the 'To' number which is our proxy, but here 'from' is admin.
            // A simple way is to find the most recent 'human' session that was notified.
            const session = await env.DB.prepare(`
                SELECT id FROM chat_sessions WHERE status = 'human' AND whatsapp_notified = 1 ORDER BY updated_at DESC LIMIT 1
            `).first();

            if (session) {
                await env.DB.prepare(`
                    INSERT INTO chat_messages (session_id, sender, text, file_url, created_at)
                    VALUES (?, 'agent', ?, ?, ?)
                `).bind(session.id, body || '', mediaUrl || null, now).run();

                await env.DB.prepare(`
                    UPDATE chat_sessions SET last_agent_response_at = ?, updated_at = ? WHERE id = ?
                `).bind(now, now, session.id).run();
            }
        } else {
            // It's a user message
            const session = await env.DB.prepare(`
                SELECT id FROM chat_sessions WHERE whatsapp_number = ? ORDER BY updated_at DESC LIMIT 1
            `).bind(from).first();

            if (session) {
                await env.DB.prepare(`
                    INSERT INTO chat_messages (session_id, sender, text, file_url, created_at)
                    VALUES (?, 'user', ?, ?, ?)
                `).bind(session.id, body || '', mediaUrl || null, now).run();

                await env.DB.prepare(`UPDATE chat_sessions SET updated_at = ? WHERE id = ?`).bind(now, session.id).run();
            }
        }

        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('[WhatsApp Webhook] error:', err);
        return new Response('Error', { status: 500 });
    }
}
