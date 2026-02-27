import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log("🚀 Starting Transaction Tables Fix...");
    const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Error: No database connection string found.");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to database.");

        const sqlPath = path.resolve(__dirname, '../SUPABASE_FIX_TRANSACTIONS.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        console.log("⏳ Executing SQL...");
        await client.query(sql);
        console.log("✅ Fix complete! orders columns added and payments/tips tables created.");
    } catch (err: any) {
        console.error("❌ Fix failed:", err.message);
    } finally {
        await client.end();
    }
}

run();
