
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.REACT_APP_FIREBASE_DATABASE_URL;

async function inspectFirebase() {
    if (!dbUrl) {
        console.error("No REACT_APP_FIREBASE_DATABASE_URL found.");
        return;
    }

    console.log(`Assuming Realtime DB at: ${dbUrl}`);

    // Try fetching root keys (shallow)
    try {
        const url = `${dbUrl}/.json?shallow=true`;
        console.log(`Fetching ${url}...`);
        const res = await axios.get(url);
        console.log("Root keys:", Object.keys(res.data || {}));
    } catch (e) {
        console.error("Error fetching root:", e.message);
    }

    // Try fetching products specifically if "products" key exists or just guess
    try {
        const url = `${dbUrl}/products.json?limitToFirst=5`;
        console.log(`Fetching ${url}...`);
        const res = await axios.get(url);
        console.log("Sample Products:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error fetching products:", e.message);
    }
}

inspectFirebase();
