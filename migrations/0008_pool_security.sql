
-- Phase 9: Gatekeeper & Download Security
-- 1. Ensure Users table has all required columns
-- Adding missing columns one by one to avoid errors if some already exist
-- full_name, phone_number, is_subscriber, subscription_end_date, referral_balance_kes, referral_code, referral_earned_days are already in 0005
-- full_name, phone_number, is_subscriber, subscription_end_date, referral_balance_kes, referral_code, referral_earned_days are already in 0005
ALTER TABLE users ADD COLUMN current_plan TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN has_used_trial BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN daily_download_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_download_reset DATETIME DEFAULT CURRENT_TIMESTAMP;
-- last_ip and device_fingerprint are already in 0007

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
