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

async function listAllCollections() {
    console.log("Listing all Firestore collections...");
    const collections = await db.listCollections();

    for (const col of collections) {
        const snapshot = await col.get();
        console.log(`- ${col.id}: ${snapshot.size} documents`);
        if (snapshot.size > 0) {
            console.log(`  Sample data from ${col.id}:`, Object.keys(snapshot.docs[0].data()));
        }
    }
}

listAllCollections().catch(console.error);
