-- 1. Extend users table
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN cover_url TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN location TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN website TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN dj_genre TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN dj_since INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN pinned_post_id TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN instagram TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN soundcloud TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN mixcloud TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;

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
