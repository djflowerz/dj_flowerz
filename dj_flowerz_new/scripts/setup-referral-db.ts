
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' }); // Try local too

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log("🚀 Starting Referral System Setup...");

    // Check for connection string
    let connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Error: No database connection string found.");
        console.error("   Please set SUPABASE_DB_URL (or DATABASE_URL) in your .env file.");
        console.error("   Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();
        console.log("✅ Connected to database.");

        const sqlPath = path.resolve(__dirname, '../SUPABASE_REFERRAL_SYSTEM.sql');
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`SQL file not found at ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf-8');
        console.log("📝 Reading SUPABASE_REFERRAL_SYSTEM.sql...");

        console.log("⏳ Executing SQL...");
        await client.query(sql);

        console.log("✅ Referral System setup complete! Tables and Function created.");
        console.log("   - referral_logs table created/checked.");
        console.log("   - referral_stats table created/checked.");
        console.log("   - issue_referral_reward function created.");

    } catch (err: any) {
        console.error("❌ Setup failed:", err.message);
        if (err.message.includes("password authentication failed")) {
            console.error("   Check your database password.");
        }
    } finally {
        await client.end();
    }
}

run();
