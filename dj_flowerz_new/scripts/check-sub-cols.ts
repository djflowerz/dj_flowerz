
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSubColumns() {
    const { data, error } = await supabase.from('subscriptions').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Subscriptions columns:', Object.keys(data[0] || {}));
        console.log('Sample row:', data[0]);
    }
}
checkSubColumns();
