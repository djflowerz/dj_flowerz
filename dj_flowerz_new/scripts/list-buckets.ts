
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

async function listBuckets() {
    console.log('🔍 Checking Supabase Storage Buckets...\n');
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`Key: ${SUPABASE_KEY?.substring(0, 20)}...`);

    try {
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('❌ Error listing buckets:', error);
            return;
        }

        if (!data || data.length === 0) {
            console.log('⚠️  No buckets found!');
            console.log('\nPlease create buckets manually in Supabase Dashboard:');
            console.log('1. Go to Storage section');
            console.log('2. Create bucket "images" (public)');
            console.log('3. Create bucket "audio" (public)');
            console.log('4. Create bucket "downloads" (private)');
            return;
        }

        console.log(`✅ Found ${data.length} bucket(s):\n`);
        data.forEach(bucket => {
            console.log(`  - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
        });

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

listBuckets().catch(console.error);
