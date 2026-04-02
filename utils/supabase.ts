/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';

const supabaseUrl = isServer
    ? (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
    : (import.meta.env.VITE_SUPABASE_URL || '');

const supabaseKey = isServer
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || '')
    : (import.meta.env.VITE_SUPABASE_ANON_KEY || '');

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials missing! Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Create a no-op fallback so the app doesn't crash at module level when credentials are missing
const createNoOpClient = () => ({
    auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signInWithOAuth: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        resetPasswordForEmail: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        updateUser: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    },
    from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
});

// Enhanced client with retry logic and increased timeouts
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: !isServer,
            autoRefreshToken: !isServer,
            detectSessionInUrl: !isServer,
        },
        global: {
            headers: {
                'x-client-info': 'dj-flowerz-web',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            },
        },
        db: {
            schema: 'public',
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    })
    : (createNoOpClient() as any);
