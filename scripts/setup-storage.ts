
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupBuckets() {
    const buckets = ['images', 'audio', 'downloads'];

    console.log('🚀 Setting up Supabase Storage Buckets...');

    for (const b of buckets) {
        console.log(`⏳ Creating bucket: ${b}...`);
        const { data, error } = await supabase.storage.createBucket(b, {
            public: true
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log(`✅ Bucket ${b} already exists.`);
            } else {
                console.error(`❌ Error creating bucket ${b}:`, error.message);
            }
        } else {
            console.log(`✨ Bucket ${b} created successfully!`);
        }
    }

    console.log('\n✅ Storage setup complete.');
}

setupBuckets().catch(console.error);
