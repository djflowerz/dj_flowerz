-- =============================================================
-- DJ FLOWERZ — CLEAN DB SCHEMA
-- Run: npx wrangler d1 execute djflowerz-db --file=./scripts/schema_clean.sql --remote
-- =============================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─────────────────────────────────────────
-- 1. USERS / PROFILES (single source of truth)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id                  TEXT PRIMARY KEY,        -- Supabase Auth UUID
    email               TEXT UNIQUE NOT NULL,
    full_name           TEXT,
    avatar_url          TEXT,
    phone_number        TEXT,
    role                TEXT DEFAULT 'user',      -- 'user' | 'admin'
    -- Subscription state
    is_subscriber       BOOLEAN DEFAULT 0,
    current_plan        TEXT DEFAULT 'none',      -- 'none' | 'monthly' | 'quarterly' | 'biannual'
    subscription_expiry DATETIME,
    has_used_trial      BOOLEAN DEFAULT 0,
    -- Pool access tracking
    daily_download_count INTEGER DEFAULT 0,
    last_download_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Referrals
    referral_code       TEXT UNIQUE,
    referral_balance_kes REAL DEFAULT 0.0,
    referral_earned_days INTEGER DEFAULT 0,
    -- Newsletter
    is_newsletter_sub   BOOLEAN DEFAULT 0,
    -- Meta
    last_ip             TEXT,
    device_fingerprint  TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_subscriber ON profiles(is_subscriber);

-- ─────────────────────────────────────────
-- 2. PRODUCTS (merged: products, products_new, product_variants, product_types)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    slug                TEXT UNIQUE,
    description         TEXT,
    short_description   TEXT,
    category            TEXT,                    -- Simple string category
    type                TEXT DEFAULT 'physical', -- 'physical' | 'digital'
    price               REAL DEFAULT 0.0,
    discount_price      REAL,
    compare_at_price    REAL,
    currency            TEXT DEFAULT 'KES',
    stock               INTEGER DEFAULT 0,
    sku                 TEXT,
    brand               TEXT,
    image               TEXT,                    -- Primary image URL
    images              TEXT DEFAULT '[]',       -- JSON: ["url1","url2"]
    variant_groups      TEXT DEFAULT '[]',       -- JSON: [{name,variants:[{name,price,stock,sku}]}]
    -- Status
    status              TEXT DEFAULT 'published',-- 'draft' | 'published'
    visibility          TEXT DEFAULT 'public',   -- 'public' | 'private'
    is_active           BOOLEAN DEFAULT 1,
    is_featured         BOOLEAN DEFAULT 0,
    is_free             BOOLEAN DEFAULT 0,
    requires_shipping   BOOLEAN DEFAULT 1,
    track_stock         BOOLEAN DEFAULT 1,
    whatsapp_enabled    BOOLEAN DEFAULT 1,
    -- Digital
    download_url        TEXT,
    -- SEO
    meta_title          TEXT,
    meta_description    TEXT,
    meta_keywords       TEXT,
    tag_list            TEXT,
    -- Physical details
    weight              REAL,
    dimensions          TEXT,
    os                  TEXT,
    release_date        DATETIME,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ─────────────────────────────────────────
-- 3. ORDERS + ORDER ITEMS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name       TEXT,
    customer_email      TEXT,
    customer_phone      TEXT,
    city                TEXT,
    address             TEXT,
    total_amount        REAL DEFAULT 0.0,
    shipping_amount     REAL DEFAULT 0.0,
    discount_amount     REAL DEFAULT 0.0,
    coupon_code         TEXT,
    status              TEXT DEFAULT 'pending',  -- 'pending'|'processing'|'shipped'|'completed'|'cancelled'
    payment_status      TEXT DEFAULT 'unpaid',   -- 'unpaid'|'paid'|'refunded'
    payment_method      TEXT,
    payment_ref         TEXT,
    tracking_number     TEXT,
    shipping_provider   TEXT,
    notes               TEXT,
    items               TEXT DEFAULT '[]',       -- JSON snapshot for quick display
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id          TEXT,
    product_name        TEXT NOT NULL,
    variant_name        TEXT,
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_price          REAL NOT NULL,
    total_price         REAL NOT NULL,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ─────────────────────────────────────────
-- 4. POOL TRACKS (music pool — keep existing structure)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pool_tracks (
    id              TEXT PRIMARY KEY,
    artist          TEXT NOT NULL DEFAULT 'DJ FLOWERZ',
    title           TEXT NOT NULL DEFAULT 'Untitled Mix',
    genre           TEXT,
    display_genre   TEXT,
    collection_hub  TEXT,
    sub_genre       TEXT,
    release_year    INTEGER,
    release_month   TEXT,
    vibe            TEXT DEFAULT 'Hype',
    preview_url     TEXT,
    download_url    TEXT,
    versions        TEXT DEFAULT '[]',   -- JSON: [{type,label,downloadUrl}]
    bpm             INTEGER DEFAULT 0,
    category        TEXT DEFAULT '[]',   -- JSON: ["tag1","tag2"]
    link_status     TEXT DEFAULT 'unchecked',
    date_added      TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pool_tracks_genre ON pool_tracks(display_genre);
CREATE INDEX IF NOT EXISTS idx_pool_tracks_hub ON pool_tracks(collection_hub);
CREATE INDEX IF NOT EXISTS idx_pool_tracks_year ON pool_tracks(release_year);

-- ─────────────────────────────────────────
-- 5. MIXTAPES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mixtapes (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    artist          TEXT DEFAULT 'DJ Flowerz',
    genre           TEXT,
    description     TEXT,
    cover_url       TEXT,
    audio_url       TEXT,
    download_url    TEXT,
    slug            TEXT UNIQUE,
    is_featured     BOOLEAN DEFAULT 0,
    is_free         BOOLEAN DEFAULT 1,
    required_tier   TEXT DEFAULT 'free',         -- 'free' | 'music_pool'
    status          TEXT DEFAULT 'published',
    download_type   TEXT DEFAULT 'free',
    show_in_music_pool BOOLEAN DEFAULT 0,
    play_count      INTEGER DEFAULT 0,
    download_count  INTEGER DEFAULT 0,
    duration        TEXT,
    tags            TEXT DEFAULT '[]',
    release_date    TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mixtapes_status ON mixtapes(status);
CREATE INDEX IF NOT EXISTS idx_mixtapes_genre ON mixtapes(genre);

-- ─────────────────────────────────────────
-- 6. SUBSCRIPTION PLANS + SUBSCRIPTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL DEFAULT 0.0,
    period      TEXT DEFAULT 'mo',      -- 'mo' | 'qtr' | 'biannual'
    features    TEXT DEFAULT '[]',      -- JSON array
    link        TEXT,
    active      BOOLEAN DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id     TEXT REFERENCES subscription_plans(id),
    plan_name   TEXT,
    status      TEXT DEFAULT 'active',  -- 'active' | 'expired' | 'cancelled'
    payment_ref TEXT,
    start_date  DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date    DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ─────────────────────────────────────────
-- 7. INTERACTIONS (merged: reviews, mixtape_comments, support_tickets)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interactions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    user_name   TEXT,
    type        TEXT NOT NULL,      -- 'review' | 'comment' | 'support'
    target_id   TEXT,               -- Product ID or Mixtape ID
    target_type TEXT,               -- 'product' | 'mixtape' | 'pool_track'
    content     TEXT,
    rating      INTEGER,            -- 1-5 for reviews, NULL for comments
    status      TEXT DEFAULT 'pending', -- 'pending'|'approved'|'rejected'|'resolved'
    admin_notes TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON interactions(status);

-- ─────────────────────────────────────────
-- 8. SETTINGS (key-value store — merged: settings, store_settings)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    category    TEXT DEFAULT 'general', -- 'site' | 'store' | 'pool' | 'general'
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 9. ADMIN LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    action      TEXT NOT NULL,
    details     TEXT,
    admin_user  TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 10. COUPONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
    id                      TEXT PRIMARY KEY,
    code                    TEXT UNIQUE NOT NULL,
    scope                   TEXT DEFAULT 'all',          -- 'store'|'music_pool'|'all'
    discount_type           TEXT DEFAULT 'percentage',   -- 'percentage'|'fixed_amount'
    discount_value          REAL DEFAULT 0,
    min_spend               REAL DEFAULT 0,
    expiry_date             DATETIME,
    max_uses_total          INTEGER,
    is_one_time_per_user    BOOLEAN DEFAULT 1,
    created_by_ref_user_id  TEXT,
    is_active               BOOLEAN DEFAULT 1,
    usage_count             INTEGER DEFAULT 0,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 11. REFERRALS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
    id              TEXT PRIMARY KEY,
    referrer_id     TEXT REFERENCES profiles(id),
    referred_id     TEXT REFERENCES profiles(id),
    status          TEXT DEFAULT 'pending',  -- 'pending'|'completed'|'flagged'
    reward_granted  BOOLEAN DEFAULT 0,
    ip_address      TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 12. BOOKINGS (studio + gigs stay separate — very different fields)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS studio_sessions (
    id              TEXT PRIMARY KEY,
    customer_email  TEXT,
    session_date    TEXT NOT NULL,
    start_time      TEXT NOT NULL,
    duration_hours  INTEGER DEFAULT 1,
    extras          TEXT DEFAULT '[]',
    total_price_kes REAL,
    status          TEXT DEFAULT 'pending',
    paystack_ref    TEXT UNIQUE,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_gigs (
    id              TEXT PRIMARY KEY,
    client_name     TEXT,
    client_email    TEXT,
    event_date      TEXT UNIQUE NOT NULL,
    event_type      TEXT,
    location_details TEXT,
    guests_estimate INTEGER,
    requirements    TEXT,
    quote_amount    REAL,
    deposit_received REAL DEFAULT 0.0,
    status          TEXT DEFAULT 'inquiry',
    paystack_ref    TEXT UNIQUE,
    created_at      TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- 13. NEWSLETTER
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    full_name   TEXT,
    tags        TEXT DEFAULT '[]',
    is_active   BOOLEAN DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id              TEXT PRIMARY KEY,
    subject         TEXT NOT NULL,
    content         TEXT NOT NULL,
    target_audience TEXT DEFAULT 'all',
    sent_count      INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'draft',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 14. GENRES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS genres (
    id          TEXT PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url   TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 15. DOWNLOAD HISTORY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS download_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT REFERENCES profiles(id),
    track_id    TEXT,
    track_type  TEXT DEFAULT 'pool',   -- 'pool' | 'mixtape'
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 16. D1 MIGRATION TRACKING
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS d1_migrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE,
    applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
