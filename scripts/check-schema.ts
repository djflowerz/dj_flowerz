import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSchema() {
    const tableName = process.argv[2] || 'profiles';
    console.log(`Checking ${tableName} columns...`);
    const { data: row } = await supabase.from(tableName).select('*').limit(1).single();
    if (row) {
        console.log('Columns found:', Object.keys(row));
        console.log('Sample row:', row);
    } else {
        console.log('No rows found to inspect or error occurred.');
    }
}

checkSchema();
