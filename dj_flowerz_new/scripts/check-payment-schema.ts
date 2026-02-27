
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSchema() {
    const tables = ['payments', 'subscriptions', 'orders', 'profiles'];
    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns:`, Object.keys(data[0]));
            console.log(`Sample:`, data[0]);
        } else {
            console.log('No data found to determine columns.');
        }
    }
}

checkSchema();
