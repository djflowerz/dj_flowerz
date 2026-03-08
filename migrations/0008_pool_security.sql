
-- Phase 9: Gatekeeper & Download Security
-- 1. Ensure Users table has all required columns
-- Adding missing columns one by one to avoid errors if some already exist
ALTER TABLE users ADD COLUMN full_name TEXT;
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN is_subscriber BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN subscription_end_date DATETIME;
ALTER TABLE users ADD COLUMN referral_balance_kes INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referral_earned_days INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN current_plan TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN has_used_trial BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN daily_download_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_download_reset DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN last_ip TEXT;
ALTER TABLE users ADD COLUMN device_fingerprint TEXT;

-- 2. Grant Master Admin "Forever Pro" Access
UPDATE users 
SET is_subscriber = 1, 
    current_plan = 'pro',
    subscription_end_date = '2099-12-31 23:59:59' 
WHERE email = 'ianmuriithiflowerz@gmail.com';

-- 3. Ensure tracks table has the right Service Pack metadata (if missing)
-- Table re-creation was handled in Phase 8, but this ensures indices exist
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(display_genre);
CREATE INDEX IF NOT EXISTS idx_track_versions_parent ON track_versions(track_id);
