
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
        credential: admin.credential.cert(serviceAccount)
    });
}

// Get the actual @google-cloud/storage Storage instance
const storage = admin.storage().storage;

async function findCorrectBucket() {
    console.log('🔍 Searching for correct Firebase Storage bucket...\n');

    try {
        // This is the correct method for the underlying storage instance
        const [buckets] = await storage.getBuckets();

        if (buckets.length === 0) {
            console.log('❌ No buckets found in this project.');
            return;
        }

        console.log(`✅ Found ${buckets.length} bucket(s):`);
        buckets.forEach(b => {
            console.log(`  - ${b.name}`);
        });

    } catch (err: any) {
        console.error('❌ Error listing buckets:', err.message);
    }
}

findCorrectBucket().catch(console.error);
