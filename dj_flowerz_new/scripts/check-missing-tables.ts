import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
        `);
        console.log('Tables in public schema:');
        const tables = res.rows.map(r => r.tablename);
        tables.sort().forEach(t => console.log(`- ${t}`));

        const TABLES_TO_MIGRATE = [
            'products',
            'mixtapes',
            'pool_tracks',
            'session_types',
            'studio_equipment',
            'subscription_plans',
            'shipping_zones',
            'genres',
            'videos',
            'youtube_videos',
            'studio_rooms',
            'maintenance_logs',
            'coupons',
            'newsletter_campaigns',
            'referral_stats',
            'newsletter_subscribers',
            'newsletter_segments',
            'telegram_config',
            'telegram_channels',
            'telegram_mappings',
            'telegram_users',
            'telegram_logs',
            'tips',
            'orders',
            'payments',
            'referral_logs',
            'settings',
            'contact_messages'
        ];

        console.log('\nMissing tables:');
        TABLES_TO_MIGRATE.forEach(t => {
            if (!tables.includes(t)) {
                console.log(`❌ ${t}`);
            } else {
                console.log(`✅ ${t}`);
            }
        });

    } finally {
        client.release();
        await pool.end();
    }
}

checkTables().catch(console.error);
