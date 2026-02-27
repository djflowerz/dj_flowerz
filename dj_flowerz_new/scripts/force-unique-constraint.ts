
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function addUniqueConstraint() {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
        console.error('SUPABASE_DB_URL not found in environment variables');
        return;
    }

    // Clean up the URL if it contains pooler/pgbouncer params that might interfere with direct connection if not handled
    // But since pg supports connection strings, we'll try it as is first.

    const client = new Client({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false // Required for Supabase in many environments
        }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase DB via pg Client');

        // Check if constraint already exists
        const checkResult = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'payments' AND constraint_name = 'payments_payment_ref_key';
        `);

        if (checkResult.rows.length > 0) {
            console.log('Unique constraint "payments_payment_ref_key" already exists.');
        } else {
            console.log('Adding UNIQUE constraint to payments.payment_ref...');
            await client.query('ALTER TABLE payments ADD CONSTRAINT payments_payment_ref_key UNIQUE (payment_ref);');
            console.log('Successfully added UNIQUE constraint.');
        }
    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

addUniqueConstraint();
