
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkPayments() {
    const { data: payments, error } = await supabase.from('payments').select('*').limit(10);
    if (error) {
        console.error('Error fetching payments:', error);
    } else {
        console.log('Payments in DB:', payments.map(p => ({ email: p.user_email, amount: p.amount, type: p.payment_type })));
    }

    const { data: subscriptions, error: subError } = await supabase.from('subscriptions').select('*').limit(10);
    if (subError) {
        console.error('Error fetching subscriptions:', subError);
    } else {
        console.log('Subscriptions in DB:', subscriptions.map(s => ({ email: s.user_email, status: s.status, plan: s.plan_id })));
    }

    const { data: profiles, error: profError } = await supabase.from('profiles').select('*').filter('is_subscriber', 'eq', true).limit(10);
    if (profError) {
        console.error('Error fetching profiles:', profError);
    } else {
        console.log('Active Subscribers in Profiles:', profiles.map(p => ({ email: p.email, plan: p.subscription_plan })));
    }
}

checkPayments();
