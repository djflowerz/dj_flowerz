
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES_TO_EXPORT = [
    'products',
    'mixtapes',
    'pool_tracks',
    'genres',
    'session_types',
    'studio_equipment',
    'subscription_plans',
    'shipping_zones',
    'youtube_videos',
    'coupons',
    'studio_rooms',
    'settings'
];

async function exportTable(table: string) {
    console.log(`Exporting ${table}...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
        console.error(`Error exporting ${table}:`, error.message);
        return;
    }

    const outputDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${data.length} records to ${filePath}`);
}

async function run() {
    console.log("Starting Supabase to R2 Export (Local JSON phase)...");

    for (const table of TABLES_TO_EXPORT) {
        await exportTable(table);
    }

    console.log("\nNext Steps:");
    console.log("1. Upload the contents of 'public/data/' to your Cloudflare R2 bucket.");
    console.log("2. Ensure the R2 bucket is public or has a public CDN URL.");
    console.log("3. Update VITE_R2_URL in your environment variables.");
}

run();
