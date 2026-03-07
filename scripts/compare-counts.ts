
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;

const DEST_URL = process.env.VITE_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
    if (SOURCE_URL && SOURCE_KEY) {
        const source = createClient(SOURCE_URL, SOURCE_KEY);
        const { count, error } = await source.from('products').select('*', { count: 'exact', head: true });
        console.log(`Source Products: ${count} (Error: ${error?.message})`);

        const { count: mixCount } = await source.from('mixtapes').select('*', { count: 'exact', head: true });
        console.log(`Source Mixtapes: ${mixCount}`);
    }

    if (DEST_URL && DEST_KEY) {
        const dest = createClient(DEST_URL, DEST_KEY);
        const { count, error } = await dest.from('products').select('*', { count: 'exact', head: true });
        console.log(`Dest Products: ${count} (Error: ${error?.message})`);

        const { count: mixCount } = await dest.from('mixtapes').select('*', { count: 'exact', head: true });
        console.log(`Dest Mixtapes: ${mixCount}`);
    }
}

check();
