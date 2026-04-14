// worker/api/presence.js
import { getAuthorizedUser } from '../utils/auth.js';

/**
 * POST /api/presence
 * Heartbeat from the client to keep user "online" in D1.
 * Admin dashboard reads from D1 profiles table.
 */
export async function handlePresence(request, env) {
  try {
    const user = await getAuthorizedUser(request, env);
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    
    // Update D1
    await env.DB.prepare(`
      UPDATE profiles 
      SET last_seen = ?, presence_status = 'online', updated_at = ? 
      WHERE id = ?
    `).bind(now, now, user.id).run();

    return Response.json({ success: true, timestamp: now });
  } catch (err) {
    console.error('[Presence API Error]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
