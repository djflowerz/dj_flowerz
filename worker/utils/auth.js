// worker/utils/auth.js

export async function verifySupabaseJWT(token, secret) {
    if (!token || !secret) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;
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
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
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
    if (!payload || !payload.email) return null;

    // Fetch full user record from D1
    const user = await env.DB.prepare("SELECT * FROM profiles WHERE email = ?").bind(payload.email).first();
    return user;
}
