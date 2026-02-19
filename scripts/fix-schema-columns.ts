
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const { Client } = pg;

async function fixSchema() {
    console.log("🚀 Starting Schema Fix...");

    const connectionString = process.env.SUPABASE_DB_URL;

    if (!connectionString) {
        console.error("❌ Error: SUPABASE_DB_URL not found in .env");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to database.");

        const sql = `
            -- Fix Products Table
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS os TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN DEFAULT TRUE;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS digital_file_url TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS download_password TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'visible';
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title TEXT;
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;

            -- Fix Orders Table
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC;
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC;
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC;
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS date TEXT;
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS time TEXT;
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reference_code TEXT;
            ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'store';
            
            -- Fix Profiles Table (if missing phone_number or status)
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline';

            -- Fix Subscriptions Table
            ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_email TEXT;
        `;

        console.log("⏳ Executing SQL to add missing columns...");
        await client.query(sql);

        console.log("✅ Schema fix complete! Missing columns added to products, orders, and profiles.");

    } catch (err: any) {
        console.error("❌ Fix failed:", err.message);
    } finally {
        await client.end();
    }
}

fixSchema();
