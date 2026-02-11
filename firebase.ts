
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ-yumwuCfGwxgjRhyCUIIc50_tcmEwb4",
  authDomain: "flowpay-401a4.firebaseapp.com",
  databaseURL: "https://flowpay-401a4-default-rtdb.firebaseio.com",
  projectId: "flowpay-401a4",
  storageBucket: "flowpay-401a4.firebasestorage.app",
  messagingSenderId: "990425156188",
  appId: "1:990425156188:web:0b95648801bdd2a7d3f499"
};

// Initialize Firebase (ensure singleton)
const app = !firebase.apps.length 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.app();

export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();

// Enable long polling to fix connection issues in restricted network environments
// This is critical for the "Could not reach Cloud Firestore backend" error
try {
  db.settings({ 
    experimentalForceLongPolling: true,
    merge: true // Helps with some offline persistence behaviors
  });
} catch (e) {
  console.warn("Firestore settings could not be applied:", e);
}

export default app;
