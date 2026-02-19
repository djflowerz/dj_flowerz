
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSubColumns() {
    const { data, error } = await supabase.from('subscriptions').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Columns in subscriptions:', Object.keys(data[0]));
    } else {
        console.log('No data in subscriptions table yet.');
    }
}

checkSubColumns();
