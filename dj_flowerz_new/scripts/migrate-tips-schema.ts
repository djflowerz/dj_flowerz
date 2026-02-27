
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function migrateTipsSchema() {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
        console.error('SUPABASE_DB_URL not found in environment variables');
        return;
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase DB');

        console.log('Adding user_name column to tips table...');
        await client.query('ALTER TABLE tips ADD COLUMN IF NOT EXISTS user_name TEXT;');

        console.log('Successfully updated tips schema.');
    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

migrateTipsSchema();
