import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkCollections() {
    const collections = ['payments', 'tips'];
    for (const col of collections) {
        try {
            const snapshot = await db.collection(col).get();
            console.log(`Collection ${col}: ${snapshot.size} documents found.`);
            if (snapshot.size > 0) {
                console.log(`Sample document from ${col}:`, snapshot.docs[0].data());
            }
        } catch (e: any) {
            console.error(`Error checking ${col}:`, e.message);
        }
    }
}

checkCollections().catch(console.error);
