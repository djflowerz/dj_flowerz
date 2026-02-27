-- ==========================================
-- SECURITY & DOWNLOAD LIMIT ENHANCEMENTS
-- ==========================================

-- 1. Extend profiles table with tracking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS downloads_today INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_download_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;

-- 2. Create download_logs table for audit and security
CREATE TABLE IF NOT EXISTS download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT, -- For guest/store downloads
    type TEXT DEFAULT 'track', -- 'track', 'mixtape_audio', 'mixtape_video', 'digital_product'
    track_id TEXT, -- ID from pool_tracks, mixtapes, or products
    version_id TEXT,
    details JSONB, -- For storing artist, title, etc.
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date_only DATE DEFAULT CURRENT_DATE
);

-- Index for daily limit calculations
CREATE INDEX IF NOT EXISTS idx_download_logs_user_date ON download_logs(user_id, date_only);

-- 3. Enable RLS on download_logs
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies for download_logs
CREATE POLICY "Users can view own download logs" ON download_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all download logs" ON download_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. Track-specific stats table (optional but good for dashboard)
CREATE TABLE IF NOT EXISTS track_stats (
    track_id TEXT PRIMARY KEY,
    download_count INTEGER DEFAULT 0,
    preview_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Realtime for the new table and profile updates
-- Assuming supabase_realtime publication exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE download_logs;
    END IF;
END $$;

-- 7. Function to increment download count (can be called via RPC)
CREATE OR REPLACE FUNCTION increment_download_count(t_id TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO track_stats (track_id, download_count, last_accessed)
    VALUES (t_id, 1, NOW())
    ON CONFLICT (track_id)
    DO UPDATE SET download_count = track_stats.download_count + 1, last_accessed = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
