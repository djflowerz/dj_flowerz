
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const password = process.env.SUPABASE_SERVICE_ROLE_KEY;
const host = 'db.ogdxnqzhqvvhrrvrqoup.supabase.co';
const user = 'postgres';
const database = 'postgres';

const client = new pg.Client({
    host,
    port: 5432,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        console.log('Connecting to Supabase DB...');
        await client.connect();
        console.log('✅ Connected successfully!');
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

test();
