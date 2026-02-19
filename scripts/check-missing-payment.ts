import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    const email = 'bidalielvis@gmail.com';
    const ref = 'sub_KHpgU9C3B5Vnmr1iZsOa_1771424886961';

    console.log(`🔍 Checking for user: ${email}`);
    const { data: user } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    console.log(user || '❌ User not found');

    console.log(`\n🔍 Checking for payment ref: ${ref}`);
    const { data: payment } = await supabase.from('payments').select('*').eq('payment_ref', ref).maybeSingle();
    console.log(payment || '❌ Payment not found');

    console.log(`\n🔍 Checking for subscription for email: ${email}`);
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_email', email).maybeSingle();
    console.log(sub || '❌ Subscription not found');
}

run().catch(console.error);
