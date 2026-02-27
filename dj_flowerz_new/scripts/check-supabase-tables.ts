import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const tables = ['products', 'mixtapes', 'orders', 'profiles', 'subscriptions', 'subscription_plans', 'download_logs', 'track_stats'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
        } else {
            console.log(`${table} table exists. Found:`, data.length);
        }
    }

    // Check specific columns in profiles
    const { data: cols, error: colError } = await supabase.from('profiles').select('downloads_today').limit(1);
    if (colError) {
        console.error('profiles.downloads_today column MISSING:', colError.message);
    } else {
        console.log('profiles.downloads_today column EXISTS');
    }
}
check();
