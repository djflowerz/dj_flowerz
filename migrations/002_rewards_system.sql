-- migration_002_rewards_system.sql

-- 1. Add subscription fields to profiles
ALTER TABLE profiles ADD COLUMN is_subscriber BOOLEAN DEFAULT 0;
ALTER TABLE profiles ADD COLUMN subscription_expiry DATETIME;

-- 2. Add reward fields to profiles
ALTER TABLE profiles ADD COLUMN referral_code TEXT;
ALTER TABLE profiles ADD COLUMN referral_balance_kes REAL DEFAULT 0.0;
ALTER TABLE profiles ADD COLUMN referral_earned_days INTEGER DEFAULT 0;

-- 3. Unified Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  scope TEXT NOT NULL,           -- 'store', 'music_pool', or 'all'
  discount_type TEXT NOT NULL,   -- 'percentage', 'fixed_amount', or 'flexible'
  discount_value REAL,           -- e.g., 20 (%) or 500 (KES)
  min_spend REAL DEFAULT 0,      -- e.g., only works if cart > 2000 KES
  expiry_date DATETIME,
  max_uses_total INTEGER,        -- Global limit
  is_one_time_per_user BOOLEAN DEFAULT 1,
  created_by_ref_user_id TEXT,   -- Links to the DJ who generated this referral code
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Usage Tracking
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(coupon_code, user_id)
);

-- 5. Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'flagged'
  reward_granted BOOLEAN DEFAULT 0,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Store Settings
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Initial Settings
INSERT OR IGNORE INTO store_settings (key, value) VALUES ('referral_reward_kes', '200');
INSERT OR IGNORE INTO store_settings (key, value) VALUES ('referral_reward_days', '7');
INSERT OR IGNORE INTO store_settings (key, value) VALUES ('min_withdrawal_kes', '1000');
