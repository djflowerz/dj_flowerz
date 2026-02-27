
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkProfilesColumns() {
    const { data, error } = await supabase.rpc('get_column_names', { table_name: 'profiles' });
    if (error) {
        // Fallback if RPC doesn't exist
        const { data: sample } = await supabase.from('profiles').select('*').limit(1);
        console.log('Columns in profiles (from sample):', sample && sample[0] ? Object.keys(sample[0]) : 'No data');
    } else {
        console.log('Columns in profiles:', data);
    }
}

checkProfilesColumns();
