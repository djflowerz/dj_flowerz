// worker/api/user/push.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handlePushSubscription(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(request.url);
    const method = request.method;

    if (method === 'POST') {
        if (url.pathname.endsWith('/subscribe')) {
            const subscription = await request.json();
            
            // Generate a unique ID for the subscription
            const subId = crypto.randomUUID();
            
            // Store in D1
            await env.DB.prepare(`
                INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, endpoint) DO UPDATE SET
                p256dh = excluded.p256dh,
                auth = excluded.auth
            `).bind(
                subId,
                user.id,
                subscription.endpoint,
                subscription.keys?.p256dh || '',
                subscription.keys?.auth || ''
            ).run();

            return Response.json({ success: true, message: "Subscribed successfully" });
        }

        if (url.pathname.endsWith('/unsubscribe')) {
            const { endpoint } = await request.json();
            
            await env.DB.prepare(`
                DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?
            `).bind(user.id, endpoint).run();

            return Response.json({ success: true, message: "Unsubscribed successfully" });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
}
