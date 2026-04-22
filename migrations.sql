-- DJ Flowerz Production Migration Delta
-- Finalizing Trust & Safety Infrastructure

-- 1. Extend profiles table with missing trust signals
-- Note: full_name, handle, aura_tier, is_verified already exist in production
-- ALTER TABLE profiles ADD COLUMN strikes INTEGER DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN is_shadow_banned INTEGER DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'none';
-- ALTER TABLE profiles ADD COLUMN is_manual_verify INTEGER DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN is_eligible INTEGER DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN otp_code TEXT;
-- ALTER TABLE profiles ADD COLUMN otp_expiry TEXT;
-- ALTER TABLE profiles ADD COLUMN verification_attempts INTEGER DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN completed_trades INTEGER DEFAULT 0;

-- 2. Extend pulses table
-- ALTER TABLE pulses ADD COLUMN is_shadow_banned INTEGER DEFAULT 0;

-- 3. Extend existing admin/chat tables
-- ALTER TABLE admin_logs ADD COLUMN admin_user TEXT;
-- ALTER TABLE chat_sessions ADD COLUMN ticket_number TEXT;
-- ALTER TABLE chat_sessions ADD COLUMN last_message_at TEXT;


-- 4. Create NEW Trust & Safety Tables
CREATE TABLE IF NOT EXISTS user_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reported_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  post_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_vouches (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  vouchee_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flagged_content (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  user_id TEXT,
  user_handle TEXT,
  content_snippet TEXT,
  keyword_triggered TEXT,
  reason TEXT DEFAULT 'keyword_match',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  awarded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

-- 5. Create Additional Secondary Tables
CREATE TABLE IF NOT EXISTS wishlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'product', 'mixtape', 'track'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, target_id)
);

CREATE TABLE IF NOT EXISTS mixtape_comments (
  id TEXT PRIMARY KEY,
  mixtape_id TEXT NOT NULL REFERENCES mixtapes(id),
  author_id TEXT NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- 6. User Activity & Presence
-- ALTER TABLE profiles ADD COLUMN presence_status TEXT DEFAULT 'offline';
-- ALTER TABLE profiles ADD COLUMN last_seen TEXT DEFAULT CURRENT_TIMESTAMP;
