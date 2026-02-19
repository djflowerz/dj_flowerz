import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkRealtime() {
    console.log('Checking publication supabase_realtime...');
    const { data, error } = await supabase.rpc('get_publication_tables', { pub_name: 'supabase_realtime' });

    if (error) {
        // Fallback: direct query to pg_publication_tables
        const { data: tables, error: pError } = await supabase.from('pg_publication_tables').select('tablename').eq('pubname', 'supabase_realtime');
        if (pError) {
            console.error('Error checking realtime tables:', pError.message);
        } else {
            console.log('Realtime enabled for tables:', tables.map(t => t.tablename));
        }
    } else {
        console.log('Realtime enabled for tables:', data);
    }
}

checkRealtime();
