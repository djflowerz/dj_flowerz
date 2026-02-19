import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service Account not found at ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkCollections() {
    const collections = ['payments', 'tips', 'orders', 'poolTracks'];
    for (const col of collections) {
        try {
            const snapshot = await db.collection(col).limit(5).get();
            console.log(`\n--- ${col} (${snapshot.size} docs) ---`);
            snapshot.docs.forEach(doc => {
                console.log(`ID: ${doc.id}`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        } catch (e: any) {
            console.error(`Error checking ${col}:`, e.message);
        }
    }
}

checkCollections().catch(console.error);
