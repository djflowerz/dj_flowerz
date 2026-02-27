
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');

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
        storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
}

const storage = admin.storage();

async function listFirebaseFiles() {
    console.log('📦 Listing Firebase Storage Files...\n');

    const bucket = storage.bucket();

    try {
        console.log(`Bucket: ${bucket.name}\n`);

        const [files] = await bucket.getFiles({ maxResults: 100 });

        if (files.length === 0) {
            console.log('⚠️  No files found in Firebase Storage');
            return;
        }

        console.log(`✅ Found ${files.length} files:\n`);

        // Group by folder
        const byFolder: Record<string, number> = {};

        files.forEach(file => {
            const folder = file.name.split('/')[0];
            byFolder[folder] = (byFolder[folder] || 0) + 1;
        });

        console.log('Files by folder:');
        Object.entries(byFolder).forEach(([folder, count]) => {
            console.log(`  ${folder}/: ${count} files`);
        });

        console.log('\nFirst 10 files:');
        files.slice(0, 10).forEach(file => {
            console.log(`  - ${file.name}`);
        });

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

listFirebaseFiles().catch(console.error);
