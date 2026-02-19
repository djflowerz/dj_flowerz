import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    const { data: payments } = await supabase
        .from('payments')
        .select('id, user_id, user_email, amount, status, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n--- RECENT PAYMENTS ---');
    console.table(payments);
}

run().catch(console.error);
