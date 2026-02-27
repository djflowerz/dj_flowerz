-- Enable necessary extensions
create extension if not exists moddatetime schema extensions;
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Users)
-- Using TEXT for ID to support Firebase UIDs directly
create table public.profiles (
  id text not null primary key, -- Firebase UID
  email text,
  name text,
  role text default 'user',
  is_subscriber boolean default false,
  subscription_expiry timestamptz,
  subscription_plan text,
  avatar_url text,
  referral_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid()::text = id);
create policy "Users can update own profile" on profiles for update using (auth.uid()::text = id);

-- 2. POOL TRACKS (Music Pool)
create table public.pool_tracks (
  id text default gen_random_uuid()::text primary key,
  artist text not null,
  title text not null,
  genre text,
  sub_genre text,
  category text[], 
  bpm integer,
  key text,
  year integer,
  versions jsonb default '[]', 
  date_added timestamptz default now(),
  preview_url text,
  download_url text UNIQUE,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Pool Tracks
alter table public.pool_tracks enable row level security;
create policy "Allow public read" on pool_tracks for select using (true);
create policy "Allow admin write" on pool_tracks for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

create index if not exists idx_pool_tracks_title on pool_tracks using gin (to_tsvector('english', title));
create index if not exists idx_pool_tracks_artist on pool_tracks using gin (to_tsvector('english', artist));
create index if not exists idx_pool_tracks_genre on pool_tracks (genre);

-- 3. MIXTAPES
create table public.mixtapes (
  id text default gen_random_uuid()::text primary key,
  title text not null,
  slug text unique,
  genre text,
  description text,
  release_date timestamptz,
  status text default 'published',
  cover_url text,
  audio_url text,
  duration text,
  preview_start_time text,
  allow_full_stream boolean default true,
  allow_download boolean default true,
  download_type text,
  stream_quality text,
  tracklist jsonb default '[]',
  is_featured boolean default false,
  show_in_gallery boolean default true,
  show_in_music_pool boolean default false,
  tags text[],
  enable_comments boolean default true,
  require_login_to_comment boolean default false,
  moderate_comments boolean default false,
  download_url text,
  video_download_url text,
  download_limit integer,
  download_expiry_days integer,
  required_tier text,
  youtube_url text,
  soundcloud_url text,
  meta_title text,
  meta_description text,
  og_image text,
  is_exclusive boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Mixtapes
alter table public.mixtapes enable row level security;
create policy "Allow public read" on mixtapes for select using (true);
create policy "Allow admin write" on mixtapes for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 4. ORDERS
create table public.orders (
  id text default gen_random_uuid()::text primary key,
  user_id text, -- References profiles(id)
  customer_name text,
  customer_email text,
  items jsonb default '[]',
  total numeric,
  status text default 'pending',
  payment_status text default 'unpaid',
  date timestamptz default now(),
  reference_code text,
  shipping_address text,
  tracking_number text,
  courier_name text,
  receipt_url text,
  admin_message text,
  shipped_at timestamptz,
  delivery_method text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Orders
alter table public.orders enable row level security;
create policy "Users can view own orders" on orders for select using (auth.uid()::text = user_id);
create policy "Admins can view all orders" on orders for select using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);
create policy "Admins can update orders" on orders for update using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 5. PRODUCTS
create table public.products (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  slug text unique,
  type text,
  price numeric,
  sale_price numeric,
  description text,
  images text[],
  category text,
  inventory integer default 0,
  variants jsonb default '[]',
  shipping_class text, 
  digital_file_url text,
  is_featured boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Products
alter table public.products enable row level security;
create policy "Allow public read" on products for select using (true);
create policy "Allow admin write" on products for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 6. GENRES
create table public.genres (
  id text not null primary key,
  name text not null,
  cover_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Genres
alter table public.genres enable row level security;
create policy "Allow public read genres" on genres for select using (true);
create policy "Allow admin write genres" on genres for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 7. BOOKINGS
create table public.bookings (
  id text default gen_random_uuid()::text primary key,
  user_id text, -- Optional: link to profile
  client_name text,
  client_email text,
  client_phone text,
  service_type text,
  service_name text,
  date date,
  time text,
  duration integer,
  status text default 'pending',
  payment_status text default 'pending',
  amount numeric,
  budget text,
  notes text,
  source text default 'web',
  location text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Bookings
alter table public.bookings enable row level security;
create policy "Users can view own bookings" on bookings for select using (auth.uid()::text = user_id);
create policy "Admins can view all bookings" on bookings for select using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);
create policy "Admins can manage bookings" on bookings for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 8. STUDIO EQUIPMENT
create table public.studio_equipment (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  category text,
  image text,
  description text,
  status text default 'available',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Equipment
alter table public.studio_equipment enable row level security;
create policy "Allow public read equipment" on studio_equipment for select using (true);
create policy "Allow admin management equipment" on studio_equipment for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 9. COUPONS
create table public.coupons (
  id text default gen_random_uuid()::text primary key,
  code text unique not null,
  discount_type text, -- 'percentage' or 'fixed'
  discount_value numeric,
  applies_to text, -- 'store', 'subscription', etc.
  applicable_plans text[], 
  expiry_date timestamptz,
  usage_limit integer,
  usage_count integer default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Coupons
alter table public.coupons enable row level security;
create policy "Admins can view all coupons" on coupons for select using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);
create policy "Admins can manage coupons" on coupons for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 10. SUBSCRIPTIONS (Transaction Records)
create table public.subscriptions (
  id text not null primary key,
  user_id text not null,
  user_name text,
  plan_id text,
  amount numeric,
  start_date timestamptz,
  expiry_date timestamptz,
  status text,
  payment_method text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Subscriptions
alter table public.subscriptions enable row level security;
create policy "Users can view own subscriptions" on subscriptions for select using (auth.uid()::text = user_id);
create policy "Admins can view all subscriptions" on subscriptions for select using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);
create policy "Admins can manage subscriptions" on subscriptions for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 11. STUDIO ROOMS
create table public.studio_rooms (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  capacity integer default 1,
  description text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Rooms
alter table public.studio_rooms enable row level security;
create policy "Allow public read rooms" on studio_rooms for select using (true);
create policy "Allow admin management rooms" on studio_rooms for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 11. NEWSLETTER SUBSCRIBERS
create table public.newsletter_subscribers (
  id text default gen_random_uuid()::text primary key,
  email text unique not null,
  date_subscribed date default current_date,
  status text default 'active',
  source text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Subscribers
alter table public.newsletter_subscribers enable row level security;
create policy "Admins can manage subscribers" on newsletter_subscribers for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 12. SUBSCRIPTION PLANS
create table public.subscription_plans (
  id text not null primary key,
  name text not null,
  price numeric,
  period text,
  features text[],
  active boolean default true,
  is_best_value boolean default false,
  link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Plans
alter table public.subscription_plans enable row level security;
create policy "Allow public read plans" on subscription_plans for select using (true);
create policy "Allow admin management plans" on subscription_plans for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 13. MAINTENANCE LOGS
create table public.maintenance_logs (
  id text default gen_random_uuid()::text primary key,
  item_id text, -- ID of Room or Equipment
  item_name text,
  item_type text, -- 'room' or 'equipment'
  description text,
  date date default current_date,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Maintenance Logs
alter table public.maintenance_logs enable row level security;
create policy "Admins can manage logs" on maintenance_logs for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 14. SESSION TYPES
create table public.session_types (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  description text,
  duration integer, -- duration in minutes
  price numeric,
  deposit_required boolean default false,
  equipment_included text[],
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Session Types
alter table public.session_types enable row level security;
create policy "Allow public read session types" on session_types for select using (true);
create policy "Allow admin management session types" on session_types for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 15. NEWSLETTER CAMPAIGNS
create table public.newsletter_campaigns (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  subject text,
  type text, -- 'announcement', 'mixtape', 'product'
  status text default 'draft',
  sent_date timestamptz,
  recipient_count integer default 0,
  open_rate numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Campaigns
alter table public.newsletter_campaigns enable row level security;
create policy "Admins can manage campaigns" on newsletter_campaigns for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 16. SHIPPING ZONES
create table public.shipping_zones (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  description text,
  rates jsonb default '[]', -- List of {id, type, label, price, timeline}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Shipping Zones
alter table public.shipping_zones enable row level security;
create policy "Allow public read zones" on shipping_zones for select using (true);
create policy "Allow admin management zones" on shipping_zones for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 17. TELEGRAM CONFIG
create table public.telegram_config (
  id text primary key default 'main',
  bot_token text,
  bot_username text,
  status text default 'Disconnected',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Telegram Config
alter table public.telegram_config enable row level security;
create policy "Admins can manage telegram config" on telegram_config for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 18. TELEGRAM CHANNELS
create table public.telegram_channels (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  channel_id text not null,
  genre text,
  invite_link text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Telegram Channels
alter table public.telegram_channels enable row level security;
create policy "Admins can manage telegram channels" on telegram_channels for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 19. VIDEOS (Youtube)
create table public.videos (
  id text default gen_random_uuid()::text primary key,
  title text not null,
  thumbnail text,
  url text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Videos
alter table public.videos enable row level security;
create policy "Allow public read videos" on videos for select using (true);
create policy "Allow admin management videos" on videos for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 11. Triggers
create trigger handle_updated_at_profiles before update on profiles for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_pool_tracks before update on pool_tracks for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_mixtapes before update on mixtapes for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_orders before update on orders for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_products before update on products for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_genres before update on genres for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_bookings before update on bookings for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_studio_equipment before update on studio_equipment for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_coupons before update on coupons for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_subscription_plans before update on subscription_plans for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_studio_rooms before update on studio_rooms for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_newsletter_subscribers before update on newsletter_subscribers for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_maintenance_logs before update on maintenance_logs for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_session_types before update on session_types for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_newsletter_campaigns before update on newsletter_campaigns for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_shipping_zones before update on shipping_zones for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_telegram_config before update on telegram_config for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_telegram_channels before update on telegram_channels for each row execute procedure moddatetime (updated_at);
-- 20. REFERRAL STATS
create table public.referral_stats (
  id text not null primary key, -- user_id
  total_referrals integer default 0,
  successful_referrals integer default 0,
  pending_commissions numeric default 0,
  paid_commissions numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.referral_stats enable row level security;
create policy "Users can view own referral stats" on referral_stats for select using (auth.uid()::text = id);
create policy "Admins can manage referral stats" on referral_stats for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 21. NEWSLETTER SEGMENTS
create table public.newsletter_segments (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  description text,
  filter_config jsonb default '{}',
  member_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.newsletter_segments enable row level security;
create policy "Admins can manage segments" on newsletter_segments for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 22. TELEGRAM MAPPINGS
create table public.telegram_mappings (
  id text default gen_random_uuid()::text primary key,
  plan_id text not null,
  channel_ids text[] default '{}',
  auto_invite boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.telegram_mappings enable row level security;
create policy "Admins can manage telegram mappings" on telegram_mappings for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 23. TELEGRAM USERS
create table public.telegram_users (
  id text default gen_random_uuid()::text primary key,
  user_id text unique, -- Firebase/Clerk UID
  user_name text,
  telegram_username text,
  telegram_user_id text,
  status text default 'Unlinked',
  linked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.telegram_users enable row level security;
create policy "Users can view own telegram link" on telegram_users for select using (auth.uid()::text = user_id);
create policy "Admins can manage telegram users" on telegram_users for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- 24. TELEGRAM LOGS
create table public.telegram_logs (
  id text default gen_random_uuid()::text primary key,
  action text not null,
  details text,
  user_id text,
  channel_id text,
  timestamp timestamptz default now(),
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.telegram_logs enable row level security;
create policy "Admins can view telegram logs" on telegram_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

-- TRIGGERS for the new tables
create trigger handle_updated_at_referral_stats before update on referral_stats for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_newsletter_segments before update on newsletter_segments for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_telegram_mappings before update on telegram_mappings for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_telegram_users before update on telegram_users for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_telegram_logs before update on telegram_logs for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_videos before update on videos for each row execute procedure moddatetime (updated_at);
create trigger handle_updated_at_subscriptions before update on subscriptions for each row execute procedure moddatetime (updated_at);

-- 25. SETTINGS
create table public.settings (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;
create policy "Allow public read settings" on settings for select using (true);
create policy "Admins can manage settings" on settings for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);

create trigger handle_updated_at_settings before update on settings for each row execute procedure moddatetime (updated_at);
