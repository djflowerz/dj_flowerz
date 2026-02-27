
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function countPoolTracks() {
    const { count, error } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true });
    if (error) {
        console.error(error.message);
    } else {
        console.log(`Count: ${count}`);
    }
}

countPoolTracks().catch(console.error);
