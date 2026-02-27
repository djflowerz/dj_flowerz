import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkTables() {
    console.log("Checking Supabase tables...");

    const tables = ['profiles', 'payments', 'subscriptions', 'orders', 'pool_tracks'];

    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Error checking ${table}:`, error.message);
        } else {
            console.log(`Row count: ${count}`);

            // Get columns of the first row if available
            const { data: rows, error: rowsError } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (rowsError) {
                console.error(`Error fetching row from ${table}:`, rowsError.message);
            } else if (rows && rows.length > 0) {
                console.log("Columns:", Object.keys(rows[0]));
            } else {
                console.log("Table is empty.");
            }
        }
    }
}

checkTables();
