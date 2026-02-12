
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Helper to safely get env vars in different environments (Node, Vite, Edge)
const getEnv = (key: string, fallback: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv("REACT_APP_FIREBASE_API_KEY", "AIzaSyCJ-yumwuCfGwxgjRhyCUIIc50_tcmEwb4"),
  authDomain: getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN", "flowpay-401a4.firebaseapp.com"),
  databaseURL: getEnv("REACT_APP_FIREBASE_DATABASE_URL", "https://flowpay-401a4-default-rtdb.firebaseio.com"),
  projectId: getEnv("REACT_APP_FIREBASE_PROJECT_ID", "flowpay-401a4"),
  storageBucket: getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET", "flowpay-401a4.firebasestorage.app"),
  messagingSenderId: getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID", "990425156188"),
  appId: getEnv("REACT_APP_FIREBASE_APP_ID", "1:990425156188:web:0b95648801bdd2a7d3f499")
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
