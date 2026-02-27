
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

if (!SUPABASE_DB_URL) {
    console.error("Missing SUPABASE_DB_URL");
    process.exit(1);
}

const client = new Client({
    connectionString: SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function main() {
    try {
        await client.connect();
        const sqlPath = path.join(process.cwd(), 'SUPABASE_ENABLE_REALTIME.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        console.log("Successfully enabled Realtime for missing tables.");
    } catch (e: any) {
        console.error("Error executing SQL:", e.message);
    } finally {
        await client.end();
    }
}

main();
