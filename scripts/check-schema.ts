import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSchema() {
    console.log('Checking profiles columns...');
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });

    if (error) {
        // Fallback: query a row and check keys
        const { data: row } = await supabase.from('profiles').select('*').limit(1).single();
        if (row) {
            console.log('Columns found via row inspection:', Object.keys(row));
        } else {
            console.error('Could not determine columns. Error:', error.message);
        }
    } else {
        console.log('Columns:', data);
    }
}

checkSchema();
