-- migration_003_newsletter_and_support.sql

-- 1. Subscribers Table
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  fullName TEXT,
  tags TEXT DEFAULT '[]', -- JSON array: ["DJ", "Fan", "Active Subscriber"]
  is_verified BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  subject TEXT,
  message_content TEXT NOT NULL,
  source TEXT DEFAULT 'web',    -- 'web', 'email', or 'whatsapp'
  status TEXT DEFAULT 'pending', -- 'pending', 'replied', 'closed'
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Newsletter Campaigns Table (Log sent broadcasts)
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT NOT NULL, -- 'all', 'active_djs', 'fans'
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  details TEXT,
  admin_user TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Store Settings Additions
INSERT OR IGNORE INTO store_settings (key, value) VALUES ('newsletter_welcome_subject', 'Welcome to DJ Flowerz! 🎧');
INSERT OR IGNORE INTO store_settings (key, value) VALUES ('newsletter_welcome_body', '<h1>Welcome DJ!</h1><p>Thanks for joining our community.</p>');
