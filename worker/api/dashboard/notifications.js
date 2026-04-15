// worker/api/dashboard/notifications.js
import { getAuthorizedUser } from '../../utils/auth.js';

/**
 * GET /api/admin/notifications
 * Aggregates all pending/unread items for the admin dashboard
 */
export async function handleAdminNotifications(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Run multiple counts in parallel
        const queries = {
            orders: env.DB.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`).first(),
            tracks: env.DB.prepare(`SELECT COUNT(*) as count FROM scraped_tracks WHERE status = 'pending'`).first(),
            tickets: env.DB.prepare(`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'pending'`).first(),
            chat: env.DB.prepare(`
                SELECT COUNT(*) as count FROM (
                    SELECT s.id 
                    FROM chat_sessions s
                    JOIN chat_messages m ON m.session_id = s.id
                    WHERE s.status != 'closed' 
                    AND m.sender = 'user' 
                    AND (s.last_agent_response_at IS NULL OR m.created_at > s.last_agent_response_at)
                    GROUP BY s.id
                )
            `).first(),
            studio: env.DB.prepare(`SELECT COUNT(*) as count FROM studio_sessions WHERE status = 'pending'`).first(),
            gigs: env.DB.prepare(`SELECT COUNT(*) as count FROM event_gigs WHERE status = 'inquiry'`).first(),
            maintenance: env.DB.prepare(`SELECT COUNT(*) as count FROM studio_maintenance WHERE status = 'pending'`).first()
        };

        const results = await Promise.all(Object.values(queries));
        const keys = Object.keys(queries);
        
        const counts = {};
        let total = 0;
        
        results.forEach((res, i) => {
            const count = res?.count || 0;
            counts[keys[i]] = count;
            total += count;
        });

        return Response.json({
            success: true,
            total,
            breakdown: counts,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[Notifications] Error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/user/status?sessionId=...&userId=...
 * Returns unread counts for the storefront user icons
 */
export async function handleUserStatus(request, env) {
    try {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('sessionId');
        const userId = url.searchParams.get('userId');

        let unreadMessages = 0;
        let unreadNotifications = 0;

        // 1. Check for unread chat messages for this session
        if (sessionId) {
            const chatRes = await env.DB.prepare(`
                SELECT COUNT(*) as count 
                FROM chat_messages 
                WHERE session_id = ? 
                AND sender IN ('agent', 'bot')
                AND created_at > (
                    SELECT COALESCE(MAX(created_at), '1970-01-01') 
                    FROM chat_messages 
                    WHERE session_id = ? AND sender = 'user'
                )
            `).bind(sessionId, sessionId).first();
            
            unreadMessages = chatRes?.count || 0;
        }

        // 2. Check for unread notifications from D1
        if (userId) {
            const notifRes = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM notifications 
                WHERE user_id = ? AND is_read = 0
            `).bind(userId).first();
            unreadNotifications = notifRes?.count || 0;
        }

        return Response.json({
            success: true,
            unreadMessages,
            unreadNotifications,
            total: unreadMessages + unreadNotifications
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (err) {
        console.error('[UserStatus] Error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/user/notifications
 * Returns list of notifications for the logged in user
 */
export async function handleUserNotifications(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);
        if (!user) return new Response('Unauthorized', { status: 401 });

        // REAL-TIME: JOIN profiles to ensure actor info (name/avatar) is ALWAYS current
        const { results } = await env.DB.prepare(`
            SELECT 
                n.*,
                COALESCE(p.full_name, n.actor_name, 'User') as actor_name,
                COALESCE(p.avatar_url, n.actor_avatar, '') as actor_avatar,
                COALESCE(p.username, n.actor_username, '') as actor_username
            FROM notifications n
            LEFT JOIN profiles p ON n.actor_id = p.id
            WHERE n.user_id = ? 
            ORDER BY n.created_at DESC 
            LIMIT 50
        `).bind(user.id).all();

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        return Response.json(results, { headers: corsHeaders });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/user/notifications/read
 * Marks notifications as read
 */
export async function handleMarkNotificationsRead(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);
        if (!user) return new Response('Unauthorized', { status: 401 });

        const body = await request.json();
        const { id } = body;

        if (id) {
            await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`)
                .bind(id, user.id).run();
        } else {
            await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`)
                .bind(user.id).run();
        }

        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

/**
 * Helper to create a notification
 */
export async function createNotification(env, { userId, actorId, actorName, actorAvatar, type, targetId, message }) {
    if (userId === actorId) return; // Don't notify self
    const id = crypto.randomUUID();
    await env.DB.prepare(`
        INSERT INTO notifications (id, user_id, actor_id, actor_name, actor_avatar, type, target_id, message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, actorId || null, actorName || null, actorAvatar || null, type, targetId || null, message || null).run();
}

