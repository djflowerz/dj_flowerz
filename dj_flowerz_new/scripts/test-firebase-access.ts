import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function check() {
    console.log("Checking Firebase access...");
    const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');

    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.log("✅ serviceAccountKey.json found.");
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();
        const snap = await db.collection('users').limit(1).get();
        console.log(`✅ Accessed Firestore. Found ${snap.size} users.`);
    } else {
        console.log("❌ serviceAccountKey.json not found.");
    }
}

check().catch(console.error);
