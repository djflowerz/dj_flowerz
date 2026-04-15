// worker/utils/auth.js

const ADMIN_EMAILS = [
    'ianmuriithiflowerz@gmail.com',
    'testadmin@example.com',
];

export function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

function base64UrlToUint8Array(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const bin = atob(pad ? base64 + '='.repeat(4 - pad) : base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

export async function verifySupabaseJWT(token, secret) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;

        // If we have a secret, do full HMAC-SHA256 verification
        if (secret) {
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                "raw",
                encoder.encode(secret),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["verify"]
            );
            const isValid = await crypto.subtle.verify(
                "HMAC",
                key,
                base64UrlToUint8Array(signature),
                encoder.encode(`${header}.${payload}`)
            );
            if (!isValid) {
                console.error('[Auth] JWT signature verification failed');
                return null;
            }
        }
        // No secret: decode payload and trust the Supabase-issued token.
        // Still validate expiry.

        let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4;
        if (pad) b64 += '='.repeat(4 - pad);
        
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const decodedString = new TextDecoder().decode(arr);
        const decoded = JSON.parse(decodedString);

        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            console.warn('[Auth] JWT expired');
            return null;
        }

        return decoded;
    } catch (e) {
        console.error('[Auth] JWT verification failed:', e);
        return null;
    }
}

export async function getAuthorizedUser(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];

    const payload = await verifySupabaseJWT(token, env.SUPABASE_JWT_SECRET);
    if (!payload) {
        console.error('[Auth] verifySupabaseJWT returned null. Token invalid or expired.');
        return null;
    }

    const email = payload.email;
    const sub = payload.sub;
    const metadata = payload.user_metadata || {};

    if (!email && !sub) return null;

    // Fetch user from D1 — try email first to catch existing profiles that might have different IDs
    let user = null;
    if (email) {
        user = await env.DB.prepare('SELECT * FROM profiles WHERE email = ?').bind(email).first().catch(() => null);
    }
    
    // If found by email but ID is different from Supabase SUB, reconcile them to prevent duplicates
    if (user && sub && user.id !== sub) {
        console.log(`[Auth] Reconciling profile ID for ${email}: ${user.id} -> ${sub}`);
        try {
            await env.DB.prepare('UPDATE profiles SET id = ? WHERE email = ?').bind(sub, email).run();
            user.id = sub;
        } catch (e) {
            console.error('[Auth] Failed to reconcile ID:', e);
        }
    }

    if (!user && sub) {
        user = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(sub).first().catch(() => null);
    }

    // If still no profile found, build a complete user and auto-provision in D1
    if (!user) {
        const initialName = metadata.full_name || (email ? email.split('@')[0] : 'User');
        const initialAvatar = metadata.avatar_url || '';
        const initialUsername = (email ? email.split('@')[0] : (metadata.name || 'user')).toLowerCase().replace(/[^a-z0-9]/g, '');
        
        user = { id: sub, email: email, full_name: initialName, avatar_url: initialAvatar, username: initialUsername };

        try {
            // Provision D1 record with metadata
            await env.DB.prepare(
                'INSERT OR IGNORE INTO profiles (id, email, full_name, avatar_url, username, role) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(sub, email, initialName, initialAvatar, initialUsername, 'user').run();

            // Attempt re-fetch to get complete record
            const freshUser = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(sub).first();
            if (freshUser) {
                user = freshUser;
            }
        } catch (err) {
            console.error('[Auth] Failed to auto-provision D1 profile:', err);
        }
    } else {
        // Profile exists — optionally sync missing metadata (avatar/name) if they are currently null/empty
        let updates = [];
        let params = [];
        
        if (!user.avatar_url && metadata.avatar_url) {
            updates.push('avatar_url = ?');
            params.push(metadata.avatar_url);
            user.avatar_url = metadata.avatar_url;
        }
        if ((!user.full_name || user.full_name === user.email?.split('@')[0]) && metadata.full_name) {
            updates.push('full_name = ?');
            params.push(metadata.full_name);
            user.full_name = metadata.full_name;
        }
        if (!user.username && email) {
            const defaultUsername = (email.split('@')[0] || metadata.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
            updates.push('username = ?');
            params.push(defaultUsername);
            user.username = defaultUsername;
        }

        if (updates.length > 0) {
            try {
                const query = `UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`;
                await env.DB.prepare(query).bind(...params, user.id).run();
            } catch (e) {
                console.error('[Auth] Failed to sync metadata:', e);
            }
        }
    }

    // Auto-assign admin role based on email — fixes all handlers that check user.role === 'admin'
    if (isAdminEmail(user.email)) {
        user = { ...user, role: 'admin' };
    }

    // IP-to-Session Enforcement (Fortress Phase 1)
    const currentIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip');
    if (currentIp && user.id) {
        // If IP is different from last known and user is NOT admin, we log it and potentially lock
        if (user.lastIp && user.lastIp !== currentIp && user.role !== 'admin') {
            console.warn(`[Security] User ${user.email} IP changed: ${user.lastIp} -> ${currentIp}`);
            // Check last_login to see if it's a recent change
            const lastLogin = user.lastLogin ? new Date(user.lastLogin).getTime() : 0;
            const now = Date.now();
            
            // If the IP changed within 1 hour of last login, it might be account sharing
            if (now - lastLogin < 3600000) {
                 // Hard lock logic could go here, for now we just monitor and update
            }
        }
        
        // Update presence and last IP
        try {
            await env.DB.prepare(
                'UPDATE profiles SET last_ip = ?, last_login = ?, presence_status = ? WHERE id = ?'
            ).bind(currentIp, new Date().toISOString(), 'online', user.id).run();
        } catch (e) {
            console.error('[Auth] Failed to update presence:', e);
        }
    }

    return user;
}
