
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;

const DEST_URL = process.env.VITE_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkProject(url: string, key: string, label: string) {
    const supabase = createClient(url, key);
    const { data, count, error } = await supabase.from('mixtapes').select('*', { count: 'exact' }).limit(5);
    console.log(`\n--- ${label} ---`);
    console.log(`Count: ${count}`);
    if (data && data.length > 0) {
        console.log(`First item: ${data[0].title} (Created: ${data[0].created_at})`);
    } else {
        console.log(`No data or error: ${error?.message}`);
    }
}

async function main() {
    if (SOURCE_URL && SOURCE_KEY) await checkProject(SOURCE_URL, SOURCE_KEY, 'SOURCE');
    if (DEST_URL && DEST_KEY) await checkProject(DEST_URL, DEST_KEY, 'DEST');
}

main();
