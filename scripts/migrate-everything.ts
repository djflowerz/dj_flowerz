
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// --- Configuration ---

// SOURCE Supabase (ogdxnqzhqvvhrrvrqoup)
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL || 'https://ogdxnqzhqvvhrrvrqoup.supabase.co';
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;

// DESTINATION Supabase (yevqnoynsqidtplxggzs)
const DEST_URL = process.env.VITE_SUPABASE_URL || 'https://yevqnoynsqidtplxggzs.supabase.co';
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cloudflare R2
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

if (!SOURCE_KEY || !DEST_KEY) {
    console.error('❌ Service Role Keys missing for migration.');
    console.log('Please set SOURCE_SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const sourceClient = createClient(SOURCE_URL, SOURCE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const destClient = createClient(DEST_URL, DEST_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
});

// --- Migration Logic ---

async function migrateAuthUsers() {
    console.log('\n--- 👥 Migrating Auth Users ---');
    const { data: { users }, error } = await sourceClient.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error listing source users:', error.message);
        return;
    }

    console.log(`📊 Found ${users.length} users in source.`);

    for (const user of users) {
        console.log(`  Adding user: ${user.email} (${user.id})`);
        const { error: createError } = await destClient.auth.admin.createUser({
            id: user.id,
            email: user.email,
            email_confirm: true,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
        });

        if (createError) {
            if (createError.message.includes('already exists')) {
                console.log(`  ⚠️ User ${user.email} already exists in destination.`);
            } else {
                console.error(`  ❌ Error creating user ${user.email}:`, createError.message);
            }
        } else {
            console.log(`  ✅ User ${user.email} migrated.`);
        }
    }
}

async function migrateDatabaseToR2() {
    console.log('\n--- 💾 Migrating Database to R2 ---');
    const tables = [
        'profiles', 'products', 'mixtapes', 'orders', 'subscriptions', 'subscription_plans',
        'pool_tracks', 'genres', 'videos', 'payments', 'tips', 'referral_stats',
        'newsletter_subscribers', 'contact_messages', 'bookings', 'coupons'
    ];

    for (const table of tables) {
        console.log(`📦 Syncing table: ${table}`);
        const { data, error } = await sourceClient.from(table).select('*');

        if (error) {
            console.error(`  ❌ Error fetching ${table}:`, error.message);
            continue;
        }

        const key = `data/${table}.json`;
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(data || []),
            ContentType: 'application/json'
        });

        await s3.send(command);
        console.log(`  ✅ Migrated ${data?.length || 0} rows to R2: ${key}`);
    }
}

async function migrateStorageToR2() {
    console.log('\n--- 📁 Migrating Storage to R2 ---');
    const buckets = ['mixtapes', 'products', 'avatars', 'public'];

    for (const bucket of buckets) {
        console.log(`🔍 Checking bucket: ${bucket}`);
        const { data: files, error } = await sourceClient.storage.from(bucket).list('', { limit: 1000 });

        if (error) {
            console.warn(`  ⚠️ Could not access bucket ${bucket} (maybe empty or missing)`);
            continue;
        }

        for (const file of files) {
            console.log(`  🚚 Copying: ${file.name}`);
            const { data: blob, error: downloadError } = await sourceClient.storage.from(bucket).download(file.name);

            if (downloadError) {
                console.error(`  ❌ Error downloading ${file.name}:`, downloadError.message);
                continue;
            }

            const key = `storage/${bucket}/${file.name}`;
            const uploadCmd = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: Buffer.from(await blob.arrayBuffer()),
                ContentType: blob.type
            });

            await s3.send(uploadCmd);
            console.log(`  ✅ Uploaded: ${key}`);
        }
    }
}

async function main() {
    try {
        await migrateAuthUsers();
        await migrateDatabaseToR2();
        await migrateStorageToR2();
        console.log('\n🎉 ALL MIGRATIONS FINISHED SUCCESSFULLY!');
    } catch (e: any) {
        console.error('\n💥 CRITICAL MIGRATION ERROR:', e.message);
    }
}

main();
