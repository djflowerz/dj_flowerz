import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    console.log('Connected to Supabase DB...');

    const queries = [
        // Add discount_price to products table (if not already there)
        `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;`,
        // Also ensure sale_price exists (used as alias)
        `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price NUMERIC;`,
        // Add other commonly needed product fields
        `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image TEXT;`,
        `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[];`,
        `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight NUMERIC;`,
        `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;`,
        `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT FALSE;`,
    ];

    for (const q of queries) {
        try {
            await client.query(q);
            console.log(`✅ OK: ${q.slice(0, 80)}`);
        } catch (e: any) {
            if (e.message.includes('already exists')) {
                console.log(`⚠️  Already exists: ${q.slice(0, 80)}`);
            } else {
                console.error(`❌ ERROR: ${e.message}`);
            }
        }
    }

    await client.end();
    console.log('\nMigration complete.');
}

migrate().catch(console.error);
