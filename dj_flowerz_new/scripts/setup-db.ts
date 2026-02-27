
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
    console.log("🚀 Starting Database Setup...");

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

        const sqlPath = path.resolve(__dirname, '../SUPABASE_BOOTSTRAP_BUCKETS.sql');
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`SQL file not found at ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf-8');
        console.log("📝 Reading SUPABASE_BOOTSTRAP_BUCKETS.sql...");

        // Split by semicolon? No, pg client usually handles multiple statements, 
        // but 'uuid-ossp' creation or BEGIN/COMMIT blocks might need care.
        // Simple query() should work for multiple statements if the driver supports it (pg does).

        console.log("⏳ Executing SQL...");
        await client.query(sql);

        console.log("✅ Database setup complete! Profiles table and Buckets created.");

        // Also run the full schema if needed? 
        // The bootstrap only creates profiles + buckets.
        // Let's ask user to run schema next or do it here?
        // The user asked to "fix the supabase" error which was about profiles.
        // Let's stick to the bootstrap for now to solve the immediate blocking error.

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
