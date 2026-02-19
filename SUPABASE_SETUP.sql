
-- Run this in your Supabase SQL Editor to prepare the database for the Music Pool migration

-- 1. Create the pool_tracks table
CREATE TABLE IF NOT EXISTS pool_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT,
    category TEXT[] DEFAULT '{}',
    bpm INTEGER DEFAULT 0,
    year INTEGER,
    preview_url TEXT, -- Snake case is better for Postgres
    download_url TEXT UNIQUE,
    versions JSONB DEFAULT '[]',
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_pool_tracks_title ON pool_tracks USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_pool_tracks_artist ON pool_tracks USING GIN (to_tsvector('english', artist));
CREATE INDEX IF NOT EXISTS idx_pool_tracks_genre ON pool_tracks (genre);
CREATE INDEX IF NOT EXISTS idx_pool_tracks_date_added ON pool_tracks (date_added DESC);

-- 3. Enabling RLS (Row Level Security)
ALTER TABLE pool_tracks ENABLE ROW LEVEL SECURITY;

-- 4. Create a policy to allow public reads (or limited to authenticated if you prefer)
-- If you want only subscribers to see it, we will handle that in the application logic,
-- but for now, let's allow read access for authenticated users.
CREATE POLICY "Allow authenticated reads" ON pool_tracks
    FOR SELECT
    TO authenticated
    USING (true);
