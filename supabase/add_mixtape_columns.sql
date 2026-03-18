-- Migration to add missing columns to mixtapes table in Cloudflare D1
-- Aligning with frontend Mixtape type and expected worker functionality

ALTER TABLE mixtapes ADD COLUMN slug TEXT;
ALTER TABLE mixtapes ADD COLUMN artist TEXT DEFAULT 'DJ Flowerz';
ALTER TABLE mixtapes ADD COLUMN genre TEXT;
ALTER TABLE mixtapes ADD COLUMN status TEXT DEFAULT 'draft';
ALTER TABLE mixtapes ADD COLUMN allow_full_stream INTEGER DEFAULT 1;
ALTER TABLE mixtapes ADD COLUMN allow_download INTEGER DEFAULT 1;
ALTER TABLE mixtapes ADD COLUMN download_type TEXT DEFAULT 'free';
ALTER TABLE mixtapes ADD COLUMN stream_quality TEXT DEFAULT 'high';
ALTER TABLE mixtapes ADD COLUMN tracklist TEXT; -- JSON string
ALTER TABLE mixtapes ADD COLUMN track_count INTEGER DEFAULT 0;
ALTER TABLE mixtapes ADD COLUMN featured INTEGER DEFAULT 0;
ALTER TABLE mixtapes ADD COLUMN is_free INTEGER DEFAULT 1;
ALTER TABLE mixtapes ADD COLUMN download_enabled INTEGER DEFAULT 1;
ALTER TABLE mixtapes ADD COLUMN enable_comments INTEGER DEFAULT 1;
ALTER TABLE mixtapes ADD COLUMN require_login_to_comment INTEGER DEFAULT 0;
ALTER TABLE mixtapes ADD COLUMN moderate_comments INTEGER DEFAULT 0;
ALTER TABLE mixtapes ADD COLUMN video_download_url TEXT;
ALTER TABLE mixtapes ADD COLUMN download_limit INTEGER;
ALTER TABLE mixtapes ADD COLUMN download_expiry_days INTEGER;
ALTER TABLE mixtapes ADD COLUMN youtube_url TEXT;
ALTER TABLE mixtapes ADD COLUMN soundcloud_url TEXT;
ALTER TABLE mixtapes ADD COLUMN meta_title TEXT;
ALTER TABLE mixtapes ADD COLUMN meta_description TEXT;
ALTER TABLE mixtapes ADD COLUMN og_image TEXT;
ALTER TABLE mixtapes ADD COLUMN is_exclusive INTEGER DEFAULT 0;
