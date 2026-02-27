
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    const { data: payments } = await supabase.from('payments').select('user_email, amount, payment_type, created_at').order('created_at', { ascending: false }).limit(50);
    console.log('--- PAYMENTS ---');
    console.table(payments);

    const { data: subs } = await supabase.from('subscriptions').select('user_email, user_name, plan_id, status, created_at').order('created_at', { ascending: false }).limit(20);
    console.log('\n--- SUBSCRIPTIONS ---');
    console.table(subs);

    const { data: profiles } = await supabase.from('profiles').select('email, name, is_subscriber, subscription_plan').limit(20);
    console.log('\n--- PROFILES (Subscribers) ---');
    console.table(profiles?.filter(p => p.is_subscriber));
}

run();
