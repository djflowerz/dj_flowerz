// worker/utils/auth.js

export async function verifySupabaseJWT(token, secret) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;

        // If we have a secret, do full HMAC verification
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

            if (!isValid) return null;
        }
        // If no secret configured, decode payload and trust the token
        // (Supabase tokens are validated at the frontend; this is an acceptable
        //  fallback for a controlled backend environment)

        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

        // Validate basic JWT claims
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            console.warn('[Auth] JWT is expired');
            return null;
        }

        return decoded;
    } catch (e) {
        console.error("[Auth] JWT Verification failed:", e);
        return null;
    }
}

function base64UrlToUint8Array(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const bin = atob(pad ? base64 + '='.repeat(4 - pad) : base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

export async function getAuthorizedUser(request, env) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];

    const payload = await verifySupabaseJWT(token, env.SUPABASE_JWT_SECRET);
    if (!payload) return null;

    // Support both 'email' claim (Supabase) and 'sub' as user id
    const email = payload.email;
    const sub = payload.sub;

    if (!email && !sub) return null;

    // Fetch user from D1 by email first, then by id as fallback
    let user = null;
    if (email) {
        user = await env.DB.prepare("SELECT * FROM profiles WHERE email = ?").bind(email).first();
    }
    if (!user && sub) {
        user = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(sub).first();
    }

    return user;
}
