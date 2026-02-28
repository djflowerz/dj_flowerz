import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Cloudflare R2 credentials missing in environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const collections = [
    { name: 'products', table: 'products' },
    { name: 'mixtapes', table: 'mixtapes' },
    { name: 'session_types', table: 'session_types' },
    { name: 'studio_equipment', table: 'studio_equipment' },
    { name: 'subscription_plans', table: 'subscription_plans' },
    { name: 'shipping_zones', table: 'shipping_zones' },
    { name: 'genres', table: 'genres' },
    { name: 'videos', table: 'videos' },
    { name: 'orders', table: 'orders' },
    { name: 'profiles', table: 'profiles' },
    { name: 'subscriptions', table: 'subscriptions' },
    { name: 'bookings', table: 'bookings' },
    { name: 'studio_rooms', table: 'studio_rooms' },
    { name: 'maintenance_logs', table: 'maintenance_logs' },
    { name: 'coupons', table: 'coupons' },
    { name: 'referral_stats', table: 'referral_stats' },
    { name: 'newsletter_campaigns', table: 'newsletter_campaigns' },
    { name: 'newsletter_segments', table: 'newsletter_segments' },
    { name: 'newsletter_subscribers', table: 'newsletter_subscribers' },
    { name: 'telegram_channels', table: 'telegram_channels' },
    { name: 'telegram_mappings', table: 'telegram_mappings' },
    { name: 'telegram_users', table: 'telegram_users' },
    { name: 'telegram_logs', table: 'telegram_logs' },
    { name: 'payments', table: 'payments' },
    { name: 'tips', table: 'tips' },
    { name: 'scanned_tracks', table: 'scanned_tracks' },
    { name: 'settings', table: 'settings' }
];

async function syncCollection(name: string, table: string) {
    console.log(`\n☁️ Fetching '${table}' from Supabase...`);
    try {
        const { data, error } = await supabase.from(table).select('*').limit(5000);

        if (error) {
            console.error(`❌ Error fetching ${table}:`, error.message);
            return false;
        }

        if (!data || data.length === 0) {
            console.log(`⚠️ Collection '${table}' is empty. Creating empty array in R2.`);
        } else {
            console.log(`📊 Found ${data.length} records in '${table}'.`);
        }

        const key = `data/${name}.json`;
        console.log(`📤 Uploading to R2: ${key}`);

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(data || [], null, 2),
            ContentType: "application/json",
        });

        await s3.send(command);
        console.log(`✅ Synced '${name}' to R2 successfully.`);
        return true;
    } catch (err: any) {
        console.error(`❌ Unexpected error on ${table}:`, err.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting Full Database Sync from Supabase to R2...');
    let successCount = 0;

    for (const col of collections) {
        const success = await syncCollection(col.name, col.table);
        if (success) successCount++;
    }

    console.log(`\n🎉 Sync Finished! Successfully synced ${successCount}/${collections.length} collections.`);
}

main().catch(console.error);
