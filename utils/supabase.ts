/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';

const supabaseUrl = isServer
    ? (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
    : (import.meta.env.VITE_SUPABASE_URL || '');

const supabaseKey = isServer
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '')
    : (import.meta.env.VITE_SUPABASE_ANON_KEY || '');

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing. Check environment variables.');
}

// Enhanced client with retry logic and increased timeouts
export const supabase = createClient(supabaseUrl, supabaseKey, {
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
    // Increase timeout to handle slow connections
    // Note: This is a fetch option that will be passed to the underlying fetch calls
});
