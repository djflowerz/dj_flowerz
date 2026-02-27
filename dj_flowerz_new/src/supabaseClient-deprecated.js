import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate credentials
if (!supabaseUrl || !supabasePublishableKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Export configuration for debugging (optional)
export const supabaseConfig = {
    url: supabaseUrl,
    hasKey: !!supabasePublishableKey,
};
