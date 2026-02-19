import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

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

async function checkFirestore() {
    console.log("Checking Firestore collections...");
    const collections = ['users', 'payments', 'orders', 'subscriptions'];

    for (const col of collections) {
        const snapshot = await db.collection(col).get();
        console.log(`- ${col}: ${snapshot.size} documents`);
    }
}

checkFirestore().catch(console.error);
