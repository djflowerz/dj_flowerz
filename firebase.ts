
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Firebase configuration using Environment Variables
// This allows specific configs for Dev vs Production
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCJ-yumwuCfGwxgjRhyCUIIc50_tcmEwb4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "flowpay-401a4.firebaseapp.com",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://flowpay-401a4-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "flowpay-401a4",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "flowpay-401a4.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "990425156188",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:990425156188:web:0b95648801bdd2a7d3f499"
};

// Initialize Firebase (ensure singleton)
const app = !firebase.apps.length 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.app();

export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();

// Enable long polling to fix connection issues in restricted network environments
try {
  db.settings({ 
    experimentalForceLongPolling: true,
    merge: true 
  });
} catch (e) {
  console.warn("Firestore settings could not be applied:", e);
}

export default app;
