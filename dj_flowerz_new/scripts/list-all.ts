import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function run() {
    const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const res = await client.query("SELECT schema_name FROM information_schema.schemata");
        console.log("Schemas:", res.rows.map(r => r.schema_name));

        const tables = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')");
        console.log("Tables:", tables.rows);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}
run();
