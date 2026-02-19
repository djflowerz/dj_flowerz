-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (Extends auth.users)
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user', -- 'user', 'admin'
  is_subscriber BOOLEAN DEFAULT FALSE,
  subscription_plan TEXT,
  subscription_expiry TIMESTAMPTZ,
  avatar_url TEXT,
  referral_code TEXT,
  last_login TIMESTAMPTZ,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 2. SETTINGS (Site Config)
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY, -- e.g., 'siteConfig'
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings viewable by everyone" ON settings FOR SELECT USING (true);
CREATE POLICY "Settings updateable by admin" ON settings FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 3. PRODUCTS
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  type TEXT, -- 'physical', 'digital'
  price NUMERIC,
  sale_price NUMERIC,
  description TEXT,
  images TEXT[],
  category TEXT,
  inventory INTEGER DEFAULT 0,
  variants JSONB, -- [{ name: string, options: string[] }]
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Products managed by admin" ON products FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 4. MIXTAPES
-- ==========================================
CREATE TABLE IF NOT EXISTS mixtapes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  genre TEXT,
  description TEXT,
  release_date TEXT, -- Stored as string or date
  status TEXT, -- 'draft', 'published', 'unlisted'
  cover_url TEXT,
  audio_url TEXT,
  duration TEXT,
  preview_start_time TEXT,
  allow_full_stream BOOLEAN DEFAULT FALSE,
  allow_download BOOLEAN DEFAULT FALSE,
  download_type TEXT,
  stream_quality TEXT,
  tracklist JSONB,
  is_featured BOOLEAN DEFAULT FALSE,
  show_in_gallery BOOLEAN DEFAULT TRUE,
  show_in_music_pool BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  enable_comments BOOLEAN DEFAULT TRUE,
  require_login_to_comment BOOLEAN DEFAULT TRUE,
  moderate_comments BOOLEAN DEFAULT FALSE,
  download_url TEXT,
  video_download_url TEXT,
  download_limit INTEGER,
  download_expiry_days INTEGER,
  required_tier TEXT,
  youtube_url TEXT,
  soundcloud_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  is_exclusive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mixtapes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mixtapes viewable by everyone" ON mixtapes FOR SELECT USING (true);
CREATE POLICY "Mixtapes managed by admin" ON mixtapes FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 5. POOL TRACKS
-- ==========================================
CREATE TABLE IF NOT EXISTS pool_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist TEXT NOT NULL,
    title TEXT NOT NULL,
    genre TEXT,
    category TEXT[] DEFAULT '{}',
    bpm INTEGER DEFAULT 0,
    year INTEGER,
    preview_url TEXT,
    versions JSONB DEFAULT '[]', -- [{ type, label, downloadUrl }]
    date_added TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pool_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pool tracks viewable by everyone" ON pool_tracks FOR SELECT USING (true);
CREATE POLICY "Pool tracks managed by admin" ON pool_tracks FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 6. GENRES
-- ==========================================
CREATE TABLE IF NOT EXISTS genres (
  id TEXT PRIMARY KEY,
  name TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Genres viewable by everyone" ON genres FOR SELECT USING (true);
CREATE POLICY "Genres managed by admin" ON genres FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 7. BOOKINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  service_type TEXT,
  service_name TEXT,
  date TEXT,
  time TEXT,
  duration INTEGER,
  status TEXT, -- 'pending', 'confirmed', etc.
  payment_status TEXT,
  amount NUMERIC,
  budget TEXT,
  notes TEXT,
  source TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookings managed by admin" ON bookings FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 8. SESSION TYPES
-- ==========================================
CREATE TABLE IF NOT EXISTS session_types (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  duration INTEGER,
  price NUMERIC,
  deposit_required BOOLEAN,
  equipment_included TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session types viewable by everyone" ON session_types FOR SELECT USING (true);
CREATE POLICY "Session types managed by admin" ON session_types FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 9. VIDEOS (Youtube)
-- ==========================================
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT,
  thumbnail TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos viewable by everyone" ON videos FOR SELECT USING (true);
CREATE POLICY "Videos managed by admin" ON videos FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 10. STUDIO EQUIPMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS studio_equipment (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  image TEXT,
  description TEXT,
  status TEXT, -- 'available', 'maintenance'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE studio_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipment viewable by everyone" ON studio_equipment FOR SELECT USING (true);
CREATE POLICY "Equipment managed by admin" ON studio_equipment FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 11. SUBSCRIPTION PLANS
-- ==========================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT,
  price NUMERIC,
  period TEXT,
  features TEXT[],
  active BOOLEAN,
  is_best_value BOOLEAN,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans viewable by everyone" ON subscription_plans FOR SELECT USING (true);
CREATE POLICY "Plans managed by admin" ON subscription_plans FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 12. SUBSCRIPTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  plan_id TEXT,
  amount NUMERIC,
  start_date TEXT,
  expiry_date TEXT,
  status TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manages subscriptions" ON subscriptions FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 13. ORDERS
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT,
  payment_status TEXT,
  tracking_number TEXT,
  courier_name TEXT,
  estimated_arrival TEXT,
  pickup_location TEXT,
  receipt_url TEXT,
  admin_message TEXT,
  shipped_at TEXT,
  delivery_method TEXT,
  status TEXT,
  items JSONB, -- OrderItem[]
  total NUMERIC,
  subtotal NUMERIC,
  discount_amount NUMERIC,
  shipping_cost NUMERIC,
  coupon_code TEXT,
  shipping_address TEXT,
  date TEXT,
  time TEXT,
  reference_code TEXT,
  type TEXT DEFAULT 'store',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders managed by admin" ON orders FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- Optionally allow users to see their own orders if we link them by email or user_id

-- ==========================================
-- 14. STUDIO ROOMS
-- ==========================================
CREATE TABLE IF NOT EXISTS studio_rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  capacity INTEGER,
  description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE studio_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rooms managed by admin" ON studio_rooms FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 15. MAINTENANCE LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT,
  item_type TEXT,
  description TEXT,
  date TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs managed by admin" ON maintenance_logs FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 16. COUPONS
-- ==========================================
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  discount_type TEXT,
  discount_value NUMERIC,
  applies_to TEXT,
  applicable_plans TEXT[],
  expiry_date TEXT,
  usage_limit INTEGER,
  usage_count INTEGER,
  active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coupons viewable by everyone" ON coupons FOR SELECT USING (true);
CREATE POLICY "Coupons managed by admin" ON coupons FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 17. SHIPPING ZONES
-- ==========================================
CREATE TABLE IF NOT EXISTS shipping_zones (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  rates JSONB, -- ShippingRate[]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zones viewable by everyone" ON shipping_zones FOR SELECT USING (true);
CREATE POLICY "Zones managed by admin" ON shipping_zones FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 18. NEWSLETTER CAMPAIGNS
-- ==========================================
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT,
  subject TEXT,
  type TEXT,
  status TEXT,
  sent_date TEXT,
  recipient_count INTEGER,
  open_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaigns managed by admin" ON newsletter_campaigns FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 19. NEWSLETTER SUBSCRIBERS
-- ==========================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  date_subscribed TEXT,
  status TEXT,
  source TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscribers managed by admin" ON newsletter_subscribers FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- Allow public insert for signup forms (careful with spam)
CREATE POLICY "Public can subscribe" ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- ==========================================
-- 20. NEWSLETTER SEGMENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS newsletter_segments (
  id TEXT PRIMARY KEY,
  name TEXT,
  criteria TEXT,
  count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE newsletter_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Segments managed by admin" ON newsletter_segments FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 21. REFERRAL STATS
-- ==========================================
CREATE TABLE IF NOT EXISTS referral_stats (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  referral_code TEXT,
  total_referrals INTEGER,
  total_earned NUMERIC,
  pending_payout NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referral stats managed by admin" ON referral_stats FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 22. TELEGRAM CONFIG
-- ==========================================
CREATE TABLE IF NOT EXISTS telegram_config (
  id TEXT PRIMARY KEY, -- 'main'
  bot_token TEXT,
  bot_username TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Telegram config managed by admin" ON telegram_config FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 23. TELEGRAM CHANNELS
-- ==========================================
CREATE TABLE IF NOT EXISTS telegram_channels (
  id TEXT PRIMARY KEY,
  name TEXT,
  channel_id TEXT,
  genre TEXT,
  invite_link TEXT,
  active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels managed by admin" ON telegram_channels FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 24. TELEGRAM MAPPINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS telegram_mappings (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  channel_ids TEXT[],
  auto_invite BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE telegram_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mappings managed by admin" ON telegram_mappings FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 25. TELEGRAM USERS
-- ==========================================
CREATE TABLE IF NOT EXISTS telegram_users (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  telegram_username TEXT,
  telegram_user_id TEXT,
  status TEXT,
  linked_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Telegram users managed by admin" ON telegram_users FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ==========================================
-- 26. TELEGRAM LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS telegram_logs (
  id TEXT PRIMARY KEY,
  action TEXT,
  details TEXT,
  user_id TEXT,
  channel_id TEXT,
  timestamp TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE telegram_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs managed by admin" ON telegram_logs FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
