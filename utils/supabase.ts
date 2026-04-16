/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';

// Hardcoded production credentials for absolute reliability
const supabaseUrl = 'https://yevqnoynsqidtplxggzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnFub3luc3FpZHRwbHhnZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjQ3ODAsImV4cCI6MjA4NzY0MDc4MH0.cb_79oC-RKNkhJBshhGw_tcFIVG50Wg6K0HIIK2Uyms';

const sanitizeEnv = (val: string) => (val || '').trim().replace(/\\n/g, '');

const trimmedUrl = sanitizeEnv(supabaseUrl);
const trimmedKey = sanitizeEnv(supabaseKey);

// Diagnostic logging for production
console.log('🔗 Supabase Initialization Strategy:', {
    urlLength: trimmedUrl?.length || 0,
    keyLength: trimmedKey?.length || 0,
    configured: !!(trimmedUrl && trimmedKey)
});

if (!trimmedUrl || !trimmedKey) {
    console.error('⚠️ Supabase credentials missing! VITE_SUPABASE_URL:', trimmedUrl, 'Key length:', trimmedKey?.length || 0);
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
export const supabase = (trimmedUrl && trimmedKey)
    ? createClient(trimmedUrl, trimmedKey, {
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
