import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    console.log('Update subscription plan prices...');

    // Updates
    await supabase.from('subscription_plans').update({ price: 3000 }).eq('id', 'yearly');
    await supabase.from('subscription_plans').update({ price: 2000 }).eq('id', '6months');
    await supabase.from('subscription_plans').update({ price: 1200 }).eq('id', '3months');
    await supabase.from('subscription_plans').update({ price: 500 }).eq('id', 'monthly');

    console.log('Updated successfully!');
}

main().catch(console.error);
