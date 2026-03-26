PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'expired', 'cancelled')),
    subscription_plan TEXT CHECK (subscription_plan IN ('monthly', 'quarterly', 'biannual')),
    subscription_expires_at INTEGER, -- Unix timestamp
    referral_code TEXT UNIQUE,
    points INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE music (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    embed_code TEXT,
    audio_url TEXT,
    video_url TEXT,
    cover_art_url TEXT,
    download_count INTEGER DEFAULT 0,
    is_premium INTEGER DEFAULT 1, -- SQLite uses 0/1 for boolean
    added_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES user_profiles(id) ON DELETE SET NULL,
    clerk_user_id TEXT,
    amount REAL NOT NULL,
    phone_number TEXT NOT NULL,
    mpesa_receipt TEXT UNIQUE,
    checkout_request_id TEXT UNIQUE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'product', 'tip', 'booking')),
    reference_id INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER
);
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    transaction_id INTEGER REFERENCES transactions(id),
    plan TEXT NOT NULL CHECK (plan IN ('monthly', 'quarterly', 'biannual')),
    amount REAL NOT NULL,
    starts_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE download_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    music_id INTEGER REFERENCES music(id) ON DELETE CASCADE,
    download_type TEXT CHECK (download_type IN ('audio', 'video')),
    downloaded_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  subscription_status TEXT DEFAULT 'none',
  subscription_ends_at TEXT,
  plan_id TEXT,
  telegram_connected INTEGER DEFAULT 0,
  created_at TEXT
, full_name TEXT, phone_number TEXT, is_subscriber BOOLEAN DEFAULT 0, subscription_end_date DATETIME, referral_balance_kes INTEGER DEFAULT 0, referral_code TEXT, referral_earned_days INTEGER DEFAULT 0, current_plan TEXT DEFAULT 'none', has_used_trial BOOLEAN DEFAULT 0, daily_download_count INTEGER DEFAULT 0, last_download_reset DATETIME DEFAULT CURRENT_TIMESTAMP, last_ip TEXT, device_fingerprint TEXT);
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_subscriber BOOLEAN DEFAULT 0,
    subscription_expiry DATETIME,
    subscription_plan TEXT,
    subscription_end_date DATETIME,
    phone TEXT,
    referral_code TEXT,
    referral_balance_kes REAL DEFAULT 0.0,
    referral_earned_days INTEGER DEFAULT 0
);

CREATE TABLE session_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    description TEXT,
    features TEXT, -- JSON string array
    image_url TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`currency` text DEFAULT 'KES',
	`category` text,
	`image` text,
	`images` text,
	`stock` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`rating` real DEFAULT 0,
	`reviews_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
, inventory INTEGER DEFAULT 10, is_featured BOOLEAN DEFAULT FALSE, technical_details TEXT, hotspots TEXT, use_cases TEXT, variant_groups TEXT, brand TEXT, compare_at_price REAL, status TEXT DEFAULT 'active', release_date TEXT, logistics TEXT, slug TEXT, type TEXT DEFAULT 'physical', sku TEXT, is_hot BOOLEAN DEFAULT 0, is_best_seller BOOLEAN DEFAULT 0, is_special_offer BOOLEAN DEFAULT 0, is_trending BOOLEAN DEFAULT 0, offer_expiry TEXT, weight REAL, dimensions TEXT, features TEXT, requires_shipping INTEGER DEFAULT 1, whatsapp_enabled INTEGER DEFAULT 1, digital_file_url TEXT, download_password TEXT, video_url TEXT, visibility TEXT DEFAULT 'public', os TEXT DEFAULT 'None', shipping_size TEXT);
CREATE TABLE mixtapes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    genre TEXT,
    description TEXT,
    cover_url TEXT,
    audio_url TEXT,
    download_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    release_date TEXT,
    required_tier TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, duration TEXT, tags TEXT, cover_image TEXT, play_count INTEGER DEFAULT 0, download_count INTEGER DEFAULT 0, unique_listeners INTEGER DEFAULT 0, slug TEXT, status TEXT DEFAULT 'published');
CREATE TABLE subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL DEFAULT 0.0,
    period TEXT,
    features TEXT,
    link TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id),
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    items TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, customer_name TEXT, customer_email TEXT, customer_phone TEXT, city TEXT, address TEXT, payment_status TEXT DEFAULT 'unpaid', payment_method TEXT, tracking_number TEXT, refund_status TEXT, shipping_provider TEXT, shipping_method TEXT, shipping_cost REAL DEFAULT 0.0, notes TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE genres (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE coupons (
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
CREATE TABLE coupon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(coupon_code, user_id)
);
CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'flagged'
  reward_granted BOOLEAN DEFAULT 0,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE tips (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'KES',
  message TEXT,
  donor_name TEXT,
  donor_email TEXT,
  status TEXT DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  fullName TEXT,
  tags TEXT DEFAULT '[]', -- JSON array: ["DJ", "Fan", "Active Subscriber"]
  is_verified BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE support_tickets (
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
CREATE TABLE newsletter_campaigns (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT NOT NULL, -- 'all', 'active_djs', 'fans'
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  details TEXT,
  admin_user TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE pool_tracks (
  id          TEXT PRIMARY KEY,
  artist      TEXT NOT NULL DEFAULT 'DJ FLOWERZ',
  title       TEXT NOT NULL DEFAULT 'Untitled Mix',
  -- Genre fields
  genre         TEXT,                       -- raw genre string (legacy)
  display_genre TEXT,                       -- clean, UI-facing label
  collection_hub TEXT,                      -- top-level hub
  sub_genre     TEXT,                       -- sub-category (e.g. Riddim folder name)
  -- Temporal metadata
  release_year  INTEGER,                    -- e.g. 2024, 2025
  release_month TEXT,                       -- e.g. 'March'
  -- Energy
  vibe          TEXT DEFAULT 'Hype',        -- 'Hype' | 'Low Hype' | 'Chill' | 'Energetic'
  -- URLs
  preview_url   TEXT,                       -- streamable preview
  download_url  TEXT,                       -- primary download link
  versions      TEXT DEFAULT '[]',          -- JSON: [{type, label, downloadUrl}]
  -- Metadata
  bpm           INTEGER DEFAULT 0,
  category      TEXT DEFAULT '[]',          -- JSON string array of tags
  link_status   TEXT DEFAULT 'unchecked',   -- 'ok' | 'broken' | 'unchecked'
  date_added    TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE TABLE studio_sessions (
  id                TEXT PRIMARY KEY,
  dj_id             TEXT REFERENCES users(id),
  customer_email    TEXT,                         -- fallback if guest or needed for Paystack
  session_date      TEXT NOT NULL,                -- ISO Date (YYYY-MM-DD)
  start_time        TEXT NOT NULL,                -- e.g., '14:00'
  duration_hours    INTEGER DEFAULT 1,
  extras            TEXT DEFAULT '[]',            -- JSON array of add-ons (Engineer, Video)
  total_price_kes   REAL,
  status            TEXT DEFAULT 'pending',       -- pending, paid, completed, cancelled
  paystack_ref      TEXT UNIQUE,
  created_at        TEXT DEFAULT (datetime('now'))
);
CREATE TABLE event_gigs (
  id                TEXT PRIMARY KEY,
  client_id         TEXT REFERENCES users(id),    -- internal user if registered
  client_name       TEXT,
  client_email      TEXT,
  event_date        TEXT UNIQUE NOT NULL,         -- Prevents double-booking you on one day
  event_type        TEXT,                         -- Wedding, Club, Corporate, etc.
  location_details  TEXT,
  guests_estimate   INTEGER,
  requirements      TEXT,                         -- Sound, Lighting, etc.
  quote_amount      REAL,
  deposit_received  REAL DEFAULT 0.0,
  status            TEXT DEFAULT 'inquiry',       -- inquiry, quoted, confirmed, completed
  paystack_ref      TEXT UNIQUE,
  created_at        TEXT DEFAULT (datetime('now'))
);
CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  display_genre TEXT,
  collection_hub TEXT,
  sub_genre TEXT,
  vibe TEXT,
  bpm INTEGER DEFAULT 0,
  release_year INTEGER,
  release_month TEXT,
  is_featured BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE track_versions (
  id TEXT PRIMARY KEY,
  track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL, -- 'Original', 'Extended', 'Acapella', 'Instrumental' etc.
  preview_url TEXT,
  download_url TEXT NOT NULL,
  file_size TEXT,
  is_main_version BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE TABLE studio_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate INTEGER NOT NULL, -- Hourly rate in KES
    description TEXT,
    features TEXT, -- JSON string of features
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE studio_gear (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hourly_rate INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL, -- e.g., Microphone, Headphones, Mixer
    image_url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE mixtape_comments (
    id TEXT PRIMARY KEY,
    mixtape_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE studio_maintenance (
    id TEXT PRIMARY KEY,
    studio_id TEXT NOT NULL,
    gear_id TEXT,
    issue TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, resolved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studio_id) REFERENCES studio_locations(id),
    FOREIGN KEY (gear_id) REFERENCES studio_gear(id)
);
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    has_variants BOOLEAN DEFAULT FALSE,
    is_shipping_required BOOLEAN DEFAULT TRUE,
    is_digital BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE products_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    product_type_id TEXT REFERENCES product_types(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    meta_title TEXT,
    meta_description TEXT,
    is_best_seller BOOLEAN DEFAULT FALSE,
    is_special_offer BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    offer_expiry DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
, brand TEXT, type TEXT, release_date DATETIME, image_url TEXT, short_description TEXT, visibility TEXT DEFAULT 'public', status TEXT DEFAULT 'published', tag_list TEXT, os TEXT, requires_shipping BOOLEAN DEFAULT 1, track_stock BOOLEAN DEFAULT 1, whatsapp_enabled BOOLEAN DEFAULT 1, shipping_size TEXT);
CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products_new(id) ON DELETE CASCADE,
    name TEXT, -- e.g., 'Large', 'Blue'
    sku TEXT UNIQUE,
    price DECIMAL(12, 2) NOT NULL,
    compare_at_price DECIMAL(12, 2),
    cost_price DECIMAL(12, 2),
    currency TEXT DEFAULT 'KES',
    stock_quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT TRUE,
    weight DECIMAL(10, 2), -- in KG or Grams
    image_url TEXT,
    metadata JSON, -- For complex variant options
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE orders_new (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
    payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid', 'refunded'
    currency TEXT DEFAULT 'KES',
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_address_id TEXT, -- Future expansion
    billing_address_id TEXT, -- Future expansion
    payment_method TEXT,
    paystack_reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_line_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders_new(id) ON DELETE CASCADE,
    variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL, -- Snapshot at time of order
    variant_name TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Kenya',
    postal_code TEXT,
    is_default_billing BOOLEAN DEFAULT FALSE,
    is_default_shipping BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_user_profiles_clerk_id ON user_profiles(clerk_user_id);
CREATE INDEX idx_user_profiles_subscription ON user_profiles(subscription_status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_clerk_user ON transactions(clerk_user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active);
CREATE INDEX idx_pool_tracks_display_genre  ON pool_tracks(display_genre);
CREATE INDEX idx_pool_tracks_collection_hub ON pool_tracks(collection_hub);
CREATE INDEX idx_pool_tracks_release_year   ON pool_tracks(release_year);
CREATE INDEX idx_pool_tracks_vibe           ON pool_tracks(vibe);
CREATE INDEX idx_pool_tracks_link_status    ON pool_tracks(link_status);
CREATE INDEX idx_studio_sessions_date ON studio_sessions(session_date);
CREATE INDEX idx_studio_sessions_status ON studio_sessions(status);
CREATE INDEX idx_event_gigs_date ON event_gigs(event_date);
CREATE INDEX idx_event_gigs_status ON event_gigs(status);
CREATE INDEX idx_tracks_genre ON tracks(display_genre);
CREATE INDEX idx_track_versions_parent ON track_versions(track_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_mixtape_comments_mixtape_id ON mixtape_comments(mixtape_id);
CREATE TRIGGER update_user_profiles_timestamp 
AFTER UPDATE ON user_profiles
BEGIN
    UPDATE user_profiles SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
CREATE TRIGGER update_music_timestamp 
AFTER UPDATE ON music
BEGIN
    UPDATE music SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
CREATE TRIGGER generate_referral_code
AFTER INSERT ON user_profiles
WHEN NEW.referral_code IS NULL
BEGIN
    UPDATE user_profiles 
    SET referral_code = 'DJF-' || substr(hex(randomblob(3)), 1, 6)
    WHERE id = NEW.id;
END;
