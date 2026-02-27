
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testUpload() {
    console.log('🧪 Testing Supabase Storage Upload...\n');

    // Create a minimal 1x1 PNG image (base64 decoded)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(pngBase64, 'base64');

    console.log('Attempting to upload test PNG to "images" bucket...');

    const { data, error } = await supabase.storage
        .from('images')
        .upload('test-image.png', testBuffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (error) {
        console.error('❌ Upload failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Upload successful!');
        console.log('Data:', data);

        // Try to delete the test file
        const { error: deleteError } = await supabase.storage
            .from('images')
            .remove(['test-image.png']);

        if (deleteError) {
            console.log('⚠️  Could not delete test file:', deleteError.message);
        } else {
            console.log('✅ Test file cleaned up');
        }
    }
}

testUpload().catch(console.error);
