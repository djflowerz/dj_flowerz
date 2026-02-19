import pg from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSQL() {
    const filePath = path.join(process.cwd(), 'SUPABASE_ENABLE_REALTIME.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    const client = await pool.connect();
    console.log('✅ Connected to DB');
    try {
        await client.query(sql);
        console.log('✅ Realtime Enabled via SQL');
    } catch (e: any) {
        console.error('Error executing SQL:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runSQL();
