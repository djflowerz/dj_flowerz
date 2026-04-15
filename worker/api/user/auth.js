// worker/api/user/auth.js
// DJ Flowerz — Community Auth API
// Handles registration and login with custom salts and SHA-256 hashing

import { hashPassword, generateSalt, isValidEmail } from '../../utils/crypto.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SHADOW_SECRET_KEY = 'djflowerz_stealth_default'; // Should be in env.SHADOW_SALT_SECRET

export async function handleUserAuth(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    if (request.method === 'POST') {
        if (path === '/api/auth/register') return register(request, env);
        if (path === '/api/auth/login') return login(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
}

async function register(request, env) {
    try {
        const { email, password, full_name, username } = await request.json();

        if (!email || !password || !full_name || !username) {
            return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400, headers: corsHeaders });
        }
        if (!isValidEmail(email)) {
            return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers: corsHeaders });
        }
        if (password.length < 8) {
            return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400, headers: corsHeaders });
        }

        // Check if user already exists
        const existing = await env.DB.prepare('SELECT id FROM profiles WHERE email = ? OR username = ?')
            .bind(email, username).first();
        if (existing) {
            return new Response(JSON.stringify({ error: 'User with this email or username already exists' }), { status: 409, headers: corsHeaders });
        }

        const id = crypto.randomUUID();
        const salt = generateSalt();
        const secret = env.SHADOW_SALT_SECRET || SHADOW_SECRET_KEY;
        const hashedPassword = await hashPassword(password, salt, secret);

        await env.DB.prepare(`
            INSERT INTO profiles (id, email, full_name, username, password_hash, shadow_salt, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(id, email, full_name, username, hashedPassword, salt).run();

        // For simplicity in this P2P MVP, we'll return a basic "success" 
        // In production, we'd sign a JWT here. 
        // Since we're bridging with Supabase, we'll suggest the user logs in via the UI.
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Registration successful! Please login to continue.' 
        }), { status: 201, headers: corsHeaders });

    } catch (err) {
        console.error('[Auth/Register] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

async function login(request, env) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: corsHeaders });
        }

        const user = await env.DB.prepare('SELECT * FROM profiles WHERE email = ?').bind(email).first();
        if (!user || !user.password_hash) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
        }

        const secret = env.SHADOW_SALT_SECRET || SHADOW_SECRET_KEY;
        const hashedPassword = await hashPassword(password, user.shadow_salt, secret);

        if (hashedPassword !== user.password_hash) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
        }

        // Generate a simple session token (In a real app, use JWT)
        // Here we just return the user profile with a "fake" token for the demo
        const fakeToken = btoa(JSON.stringify({ sub: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 }));

        return new Response(JSON.stringify({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            },
            token: fakeToken // Frontend should store this as the 'Authorization' header
        }), { status: 200, headers: corsHeaders });

    } catch (err) {
        console.error('[Auth/Login] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}
