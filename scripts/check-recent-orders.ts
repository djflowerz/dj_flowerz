import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    const { data: orders } = await supabase
        .from('orders')
        .select('id, user_id, customer_email, total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n--- RECENT ORDERS ---');
    console.table(orders);
}

run().catch(console.error);
