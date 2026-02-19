
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase URL or Anon Key missing in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRead() {
    const { data, error, count } = await supabase
        .from('pool_tracks')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error with Anon Key:', error.message);
    } else {
        console.log(`Anon Key can see ${count} records.`);
    }
}

testRead();
