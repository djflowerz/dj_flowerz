import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function listTables() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
        `);
        console.log('Tables in public schema:', rows.map(r => r.tablename));
    } finally {
        client.release();
        await pool.end();
    }
}

listTables();
