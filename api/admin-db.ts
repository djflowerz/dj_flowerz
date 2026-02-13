
import admin from 'firebase-admin';

/**
 * Server-side Firebase Admin SDK initialization.
 * This bypasses security rules and is used for webhooks.
 */

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

if (!admin.apps.length) {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || `https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`,
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
        });
        console.log("Firebase Admin initialized with service account");
    } else if (process.env.VITE_FIREBASE_PROJECT_ID) {
        // Fallback for local development or if Vercel is linked to Firebase
        admin.initializeApp({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID
        });
        console.log("Firebase Admin initialized with Project ID (Fallback)");
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
