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
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error('Error fetching orders:', error.message);
    } else {
        console.log('Orders table exists. Found:', data.length);
    }

    const { data: payments, error: pError } = await supabase.from('payments').select('*').limit(1);
    if (pError) {
        console.error('Error fetching payments:', pError.message);
    } else {
        console.log('Payments table exists. Found:', payments.length);
    }
}
check();
