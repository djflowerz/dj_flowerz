
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * STORAGE MIGRATION ONLY: Firebase Storage → Supabase Storage
 * Run this AFTER running SUPABASE_FIX_ALL.sql to ensure buckets exist
 */

dotenv.config();

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service Account not found`);
    process.exit(1);
}

let fileContent = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
if (fileContent.charCodeAt(0) === 0xFEFF) fileContent = fileContent.slice(1);

const serviceAccount = JSON.parse(fileContent);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `flowpay-401a4.firebasestorage.app`
    });
}

const storage = admin.storage();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    global: {
        headers: {
            'apikey': SUPABASE_KEY
        }
    }
});

async function migrateStorageFiles() {
    console.log('📦 Migrating Firebase Storage to Supabase Storage...\n');

    const bucket = storage.bucket();

    // Map Firebase Storage paths to Supabase buckets
    const pathMappings = [
        { firebasePath: 'images/', supabaseBucket: 'images' },
        { firebasePath: 'products/', supabaseBucket: 'images' },
        { firebasePath: 'mixtapes/', supabaseBucket: 'images' },
        { firebasePath: 'covers/', supabaseBucket: 'images' },
        { firebasePath: 'avatars/', supabaseBucket: 'images' },
        { firebasePath: 'audio/', supabaseBucket: 'audio' },
        { firebasePath: 'previews/', supabaseBucket: 'audio' },
        { firebasePath: 'downloads/', supabaseBucket: 'downloads' },
        { firebasePath: 'tracks/', supabaseBucket: 'downloads' }
    ];

    let totalMigrated = 0;

    for (const mapping of pathMappings) {
        try {
            console.log(`📁 Migrating ${mapping.firebasePath} → ${mapping.supabaseBucket}...`);

            const [files] = await bucket.getFiles({ prefix: mapping.firebasePath });

            if (files.length === 0) {
                console.log(`   ⚠️  No files found`);
                continue;
            }

            console.log(`   📊 Found ${files.length} files`);

            let migrated = 0;
            for (const file of files) {
                try {
                    // Download file from Firebase
                    const [fileBuffer] = await file.download();

                    // Get file metadata
                    const [metadata] = await file.getMetadata();
                    const contentType = metadata.contentType || 'application/octet-stream';

                    // Upload to Supabase
                    const fileName = file.name.replace(mapping.firebasePath, '');

                    // Skip if filename is empty (directory marker)
                    if (!fileName) continue;

                    const { error } = await supabase.storage
                        .from(mapping.supabaseBucket)
                        .upload(fileName, fileBuffer, {
                            contentType,
                            upsert: true
                        });

                    if (error) {
                        console.error(`   ❌ ${fileName}: ${error.message}`);
                    } else {
                        migrated++;
                        totalMigrated++;
                        process.stdout.write('.');
                    }
                } catch (err: any) {
                    console.error(`   ❌ Error: ${err.message}`);
                }
            }

            console.log(`\n   ✅ Migrated ${migrated}/${files.length} files\n`);
        } catch (err: any) {
            console.error(`❌ Error migrating ${mapping.firebasePath}: ${err.message}\n`);
        }
    }

    console.log(`\n🎉 Storage migration complete! Total files migrated: ${totalMigrated}`);
}

migrateStorageFiles().catch(console.error);
