
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

const TABLES_TO_MIGRATE = [
    'products',
    'mixtapes',
    'pool_tracks',
    'session_types',
    'studio_equipment',
    'subscription_plans',
    'shipping_zones',
    'genres',
    'videos',
    'youtube_videos',
    'studio_rooms',
    'maintenance_logs',
    'coupons',
    'newsletter_campaigns',
    'referral_stats',
    'newsletter_subscribers',
    'newsletter_segments',
    'telegram_config',
    'telegram_channels',
    'telegram_mappings',
    'telegram_users',
    'telegram_logs',
    'tips',
    'orders',
    'payments',
    'referral_logs',
    'settings',
    'contact_messages'
];

async function fetchInBatches(table: string, batchSize: number = 1000) {
    let allData: any[] = [];
    let from = 0;
    let to = batchSize - 1;
    let finished = false;

    console.log(`Fetching ${table} in batches...`);

    while (!finished) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, to)
            .order('id', { ascending: true }); // Need a stable sort for range

        if (error) {
            // Some tables might not have 'id', fallback to no order if it fails
            const { data: retryData, error: retryError } = await supabase
                .from(table)
                .select('*')
                .range(from, to);

            if (retryError) {
                console.error(`Error fetching ${table} at range ${from}-${to}:`, retryError.message);
                break;
            }

            if (!retryData || retryData.length === 0) {
                finished = true;
                break;
            }
            allData = allData.concat(retryData);
            if (retryData.length < batchSize) finished = true;
        } else {
            if (!data || data.length === 0) {
                finished = true;
                break;
            }
            allData = allData.concat(data);
            if (data.length < batchSize) finished = true;
        }

        console.log(`  Fetched ${allData.length} records so far...`);
        from += batchSize;
        to += batchSize;
    }

    return allData;
}

async function migrateToR2() {
    console.log('Starting migration from Supabase to Cloudflare R2...');

    for (const table of TABLES_TO_MIGRATE) {
        console.log(`Processing ${table}...`);

        // Use batch fetching for large tables
        const data = await fetchInBatches(table);

        if (!data || data.length === 0) {
            console.log(`Table ${table} is empty. Skipping.`);
            continue;
        }

        console.log(`Moving ${data.length} records from ${table} to R2...`);

        try {
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `data/${table}.json`,
                Body: JSON.stringify(data, null, 2),
                ContentType: "application/json",
            });

            await s3.send(command);
            console.log(`Successfully migrated ${table} to R2.`);
        } catch (err: any) {
            console.error(`Failed to upload ${table} to R2:`, err.message);
        }
    }

    console.log('Migration complete!');
}

migrateToR2();
