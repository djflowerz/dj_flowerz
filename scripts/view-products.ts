import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data, error } = await supabaseAdmin.from('products').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Products in Supabase:");
        data.forEach(p => console.log(`- ${p.title || p.name} (images: ${p.image || p.images?.length})`));
    }
    process.exit();
}

run();
