import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function check() {
    // Most recent 5 payments
    const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    console.log('\n--- MOST RECENT 5 PAYMENTS IN SUPABASE ---');
    if (error) console.error(error.message);
    else payments?.forEach(p => console.log(p.created_at, p.user_email, p.amount, p.payment_type, p.payment_ref));
    
    // Check webhook URL is configured
    console.log('\n--- WEBHOOK URL CHECK ---');
    const webhookUrl = 'https://dj-flowerz.vercel.app/api/paystack/webhook';
    const testRes = await fetch(webhookUrl, { method: 'GET' });
    console.log(`Webhook GET response: ${testRes.status}`);
}
check().catch(console.error);
