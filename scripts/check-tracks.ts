
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

const db = admin.firestore();

async function checkTracks() {
    console.log('🔍 Checking Firestore "tracks" collection...\n');

    try {
        const snapshot = await db.collection('tracks').limit(5).get();
        if (snapshot.empty) {
            console.log('⚠️  Collection "tracks" is empty or does not exist.');
            return;
        }

        console.log(`✅ Found documents in "tracks"! First 5 IDs:`);
        snapshot.docs.forEach(doc => console.log(`  - ${doc.id}`));

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

checkTracks().catch(console.error);
