
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function createBuckets() {
    console.log('🪣 Creating Supabase Storage Buckets...\n');

    const buckets = [
        {
            id: 'images',
            name: 'images',
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
        },
        {
            id: 'audio',
            name: 'audio',
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a']
        },
        {
            id: 'downloads',
            name: 'downloads',
            public: false,
            fileSizeLimit: 524288000, // 500MB
            allowedMimeTypes: ['application/zip', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/x-zip-compressed']
        }
    ];

    for (const bucket of buckets) {
        try {
            console.log(`Creating bucket: ${bucket.id}...`);

            const { data, error } = await supabase.storage.createBucket(bucket.id, {
                public: bucket.public,
                fileSizeLimit: bucket.fileSizeLimit,
                allowedMimeTypes: bucket.allowedMimeTypes
            });

            if (error) {
                if (error.message.includes('already exists')) {
                    console.log(`✅ Bucket '${bucket.id}' already exists`);
                } else {
                    console.error(`❌ Error creating '${bucket.id}': ${error.message}`);
                }
            } else {
                console.log(`✅ Created bucket: ${bucket.id}`);
            }
        } catch (err: any) {
            console.error(`❌ Error: ${err.message}`);
        }
    }

    console.log('\n🎉 Bucket creation complete!\n');
}

createBuckets().catch(console.error);
