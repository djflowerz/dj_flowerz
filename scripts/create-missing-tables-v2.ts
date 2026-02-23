import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- Create youtube_videos table
CREATE TABLE IF NOT EXISTS youtube_videos (
  id TEXT PRIMARY KEY,
  title TEXT,
  thumbnail TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  source TEXT DEFAULT 'web',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Policies for youtube_videos
DROP POLICY IF EXISTS "Videos viewable by everyone" ON youtube_videos;
CREATE POLICY "Videos viewable by everyone" ON youtube_videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Videos managed by admin" ON youtube_videos;
CREATE POLICY "Videos managed by admin" ON youtube_videos FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Policies for contact_messages
DROP POLICY IF EXISTS "Messages managed by admin" ON contact_messages;
CREATE POLICY "Messages managed by admin" ON contact_messages FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
DROP POLICY IF EXISTS "Public can insert messages" ON contact_messages;
CREATE POLICY "Public can insert messages" ON contact_messages FOR INSERT WITH CHECK (true);
`;

async function createTables() {
    const client = await pool.connect();
    console.log('✅ Connected to DB');
    try {
        await client.query(sql);
        console.log('✅ Missing tables created and RLS policies set.');
    } catch (e: any) {
        console.error('Error executing SQL:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createTables().catch(console.error);
