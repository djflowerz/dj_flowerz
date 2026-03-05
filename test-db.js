
import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres.yevqnoynsqidtplxggzs:%40Ravin303%23Wanjo@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function testConnection() {
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Successfully connected to database!');
        const res = await client.query('SELECT NOW()');
        console.log('Database time:', res.rows[0].now);
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
}

testConnection();
