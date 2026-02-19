import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- Drop existing policies to be safe (might error if not exist, so wrap in DO block)
DO $$
BEGIN
    -- PAYMENTS
    DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."payments";
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."payments";
    DROP POLICY IF EXISTS "Enable all for admin" ON "public"."payments";
    DROP POLICY IF EXISTS "Enable read for own" ON "public"."payments";
    
    ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Enable all for admin" ON "public"."payments"
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING ( (auth.jwt() ->> 'email') = 'ianmuriithiflowerz@gmail.com' OR (auth.jwt() ->> 'email') = 'djflowerz254@gmail.com' )
    WITH CHECK ( (auth.jwt() ->> 'email') = 'ianmuriithiflowerz@gmail.com' OR (auth.jwt() ->> 'email') = 'djflowerz254@gmail.com' );

    CREATE POLICY "Enable read for own" ON "public"."payments"
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING ( auth.uid()::text = user_id::text );

    -- SUBSCRIPTIONS
    ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable all for admin" ON "public"."subscriptions";
    DROP POLICY IF EXISTS "Enable read for own" ON "public"."subscriptions";

    CREATE POLICY "Enable all for admin" ON "public"."subscriptions"
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING ( (auth.jwt() ->> 'email') = 'ianmuriithiflowerz@gmail.com' OR (auth.jwt() ->> 'email') = 'djflowerz254@gmail.com' )
    WITH CHECK ( (auth.jwt() ->> 'email') = 'ianmuriithiflowerz@gmail.com' OR (auth.jwt() ->> 'email') = 'djflowerz254@gmail.com' );

    CREATE POLICY "Enable read for own" ON "public"."subscriptions"
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING ( auth.uid()::text = user_id::text );
    
    -- PROFILES
    -- Allow everyone to read profiles (needed for public pages/comments/etc)
    ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."profiles";
    
    CREATE POLICY "Enable read access for all users" ON "public"."profiles"
    AS PERMISSIVE FOR SELECT
    TO public
    USING ( true );
    
    DROP POLICY IF EXISTS "Enable update for users based on email" ON "public"."profiles";
    DROP POLICY IF EXISTS "Enable update for own profile" ON "public"."profiles";

    CREATE POLICY "Enable update for own profile" ON "public"."profiles"
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING ( auth.uid()::text = id::text )
    WITH CHECK ( auth.uid()::text = id::text );

    DROP POLICY IF EXISTS "Enable insert for own profile" ON "public"."profiles";
    CREATE POLICY "Enable insert for own profile" ON "public"."profiles"
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK ( auth.uid()::text = id::text );

END $$;
`;

async function run() {
    const client = await pool.connect();
    console.log('✅ Connected to DB');
    try {
        await client.query(sql);
        console.log('✅ RLS Policies Updated via SQL');
    } catch (e: any) {
        console.error('Error executing SQL:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(console.error);
