-- 1. Extend user_profiles table (COMPLETED)
-- Note: bio, location, website, is_verified, dj_genre, etc. already exist
-- ALTER TABLE user_profiles ADD COLUMN dj_genre TEXT DEFAULT '';
-- ALTER TABLE user_profiles ADD COLUMN dj_since INTEGER DEFAULT NULL;
-- ALTER TABLE user_profiles ADD COLUMN pinned_post_id TEXT DEFAULT NULL;
-- ALTER TABLE user_profiles ADD COLUMN instagram TEXT DEFAULT '';
-- ALTER TABLE user_profiles ADD COLUMN soundcloud TEXT DEFAULT '';
-- ALTER TABLE user_profiles ADD COLUMN mixcloud TEXT DEFAULT '';


-- 2. Create social infrastucture
CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  author_username TEXT DEFAULT '',
  author_role TEXT DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  media_urls TEXT DEFAULT '[]',
  is_marketplace INTEGER DEFAULT 0,
  price REAL DEFAULT 0,
  escrow_status TEXT DEFAULT 'none',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reshare_count INTEGER DEFAULT 0,
  post_type TEXT DEFAULT 'post',
  reply_to_id TEXT,
  quote_of_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_likes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  author_username TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_follows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS social_reshares (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_post ON social_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_social_follows_follower ON social_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_social_follows_following ON social_follows(following_id);


-- 3. Trust & Safety Infrastructure Extensions
-- Note: Extended columns for profiles table
ALTER TABLE profiles ADD COLUMN full_name TEXT;
ALTER TABLE profiles ADD COLUMN handle TEXT;
ALTER TABLE profiles ADD COLUMN strikes INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN aura_tier TEXT DEFAULT 'Newcomer';
ALTER TABLE profiles ADD COLUMN is_shadow_banned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN is_manual_verify INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN is_eligible INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN otp_code TEXT;
ALTER TABLE profiles ADD COLUMN otp_expiry TEXT;
ALTER TABLE profiles ADD COLUMN verification_attempts INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN completed_trades INTEGER DEFAULT 0;

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

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  details TEXT,
  admin_user TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Chat & Support
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  visitor_name TEXT,
  visitor_email TEXT,
  status TEXT DEFAULT 'bot',
  ticket_number TEXT,
  last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
