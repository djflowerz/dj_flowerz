-- ======================================================
-- Rebuild Community & Social Infrastructure
-- All tables were dropped in 20260421_decommission_community.sql
-- This migration recreates the complete social schema
-- ======================================================

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL UNIQUE,
  display_name   TEXT DEFAULT '',
  handle         TEXT UNIQUE,
  bio            TEXT DEFAULT '',
  avatar_url     TEXT DEFAULT '',
  banner_url     TEXT DEFAULT '',
  location       TEXT DEFAULT '',
  website        TEXT DEFAULT '',
  role           TEXT DEFAULT 'user',
  aura_tokens    REAL DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_verified    INTEGER DEFAULT 0,
  social_links   TEXT, -- JSON: {instagram, tiktok, twitter, youtube}
  payout_account TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_handle  ON profiles(handle);

-- 2. Pulses (posts / threads)
CREATE TABLE IF NOT EXISTS pulses (
  id               TEXT PRIMARY KEY,
  author_id        TEXT NOT NULL,
  author_name      TEXT DEFAULT '',
  author_handle    TEXT DEFAULT '',
  author_avatar    TEXT DEFAULT '',
  content          TEXT,
  media_urls       TEXT,  -- JSON array
  parent_id        TEXT,  -- for replies/threads
  quote_id         TEXT,  -- for quote-reposts
  poll_data        TEXT,  -- JSON
  hashtags         TEXT,  -- JSON array
  mentions         TEXT,  -- JSON array
  is_marketplace   INTEGER DEFAULT 0,
  deal_metadata    TEXT,  -- JSON: {price, condition, location, status}
  listing_status   TEXT DEFAULT 'available',
  listing_type     TEXT DEFAULT 'fixed',
  auction_end_at   TEXT,
  auction_start_price REAL,
  auction_reserve_price REAL,
  highest_bid      REAL DEFAULT 0,
  highest_bidder_id TEXT,
  bid_count        INTEGER DEFAULT 0,
  like_count       INTEGER DEFAULT 0,
  reply_count      INTEGER DEFAULT 0,
  reshare_count    INTEGER DEFAULT 0,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pulses_author   ON pulses(author_id);
CREATE INDEX IF NOT EXISTS idx_pulses_parent   ON pulses(parent_id);
CREATE INDEX IF NOT EXISTS idx_pulses_created  ON pulses(created_at);

-- 3. Reactions (likes/emojis on pulses)
CREATE TABLE IF NOT EXISTS reactions (
  id         TEXT PRIMARY KEY,
  pulse_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  reaction   TEXT DEFAULT 'like',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(pulse_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_pulse ON reactions(pulse_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user  ON reactions(user_id);

-- 4. Follows
CREATE TABLE IF NOT EXISTS follows (
  id           TEXT PRIMARY KEY,
  follower_id  TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  actor_id    TEXT,
  type        TEXT NOT NULL,
  content     TEXT,
  entity_id   TEXT,
  entity_type TEXT,
  is_read     INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- 6. Escrow Transactions
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id                  TEXT PRIMARY KEY,
  pulse_id            TEXT,
  buyer_id            TEXT NOT NULL,
  seller_id           TEXT NOT NULL,
  amount              REAL NOT NULL,
  fee_amount          REAL NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'escrow_held',
  buyer_evidence_url  TEXT,
  seller_evidence_url TEXT,
  tracking_number     TEXT,
  shipping_company    TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

-- 7. Direct Messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id           TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id    TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  content      TEXT NOT NULL,
  media_url    TEXT,
  is_read      INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_sender       ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient    ON direct_messages(recipient_id);

-- 8. DM Conversations (thread metadata)
CREATE TABLE IF NOT EXISTS dm_conversations (
  id             TEXT PRIMARY KEY,
  participant_1  TEXT NOT NULL,
  participant_2  TEXT NOT NULL,
  last_message   TEXT,
  last_message_at TEXT DEFAULT (datetime('now')),
  unread_count_1 INTEGER DEFAULT 0,
  unread_count_2 INTEGER DEFAULT 0,
  created_at     TEXT DEFAULT (datetime('now')),
  UNIQUE(participant_1, participant_2)
);

CREATE INDEX IF NOT EXISTS idx_dm_conv_p1 ON dm_conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_dm_conv_p2 ON dm_conversations(participant_2);

-- 9. Marketplace bids
CREATE TABLE IF NOT EXISTS marketplace_bids (
  id         TEXT PRIMARY KEY,
  pulse_id   TEXT NOT NULL,
  bidder_id  TEXT NOT NULL,
  amount     REAL NOT NULL,
  status     TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bids_pulse  ON marketplace_bids(pulse_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON marketplace_bids(bidder_id);

-- 10. Deal interests
CREATE TABLE IF NOT EXISTS deal_interests (
  id             TEXT PRIMARY KEY,
  pulse_id       TEXT NOT NULL,
  buyer_id       TEXT NOT NULL,
  seller_id      TEXT NOT NULL,
  status         TEXT DEFAULT 'pending',
  buyer_message  TEXT,
  seller_reply   TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_interests_pulse  ON deal_interests(pulse_id);
CREATE INDEX IF NOT EXISTS idx_interests_buyer  ON deal_interests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_interests_seller ON deal_interests(seller_id);
