-- ==========================================
-- 0. EXTENSIONS & SETUP
-- ==========================================
-- Enable UUID extension first to allow uuid_generate_v4()
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
-- 2. CREATE BUCKETS
-- ==========================================

-- "images" - Public bucket for product images, covers, avatars, site assets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'images', 
    'images', 
    true, 
    5242880, -- 5MB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- "audio" - Public bucket for streaming previews and non-exclusive audio.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio', 
    'audio', 
    true, 
    52428800, -- 50MB
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a']
) ON CONFLICT (id) DO NOTHING;

-- "downloads" - PRIVATE bucket for purchased products, full mixtapes, stems, zip files.
-- Accessed via Signed URLs only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'downloads', 
    'downloads', 
    false, 
    524288000, -- 500MB
    ARRAY['application/zip', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/x-zip-compressed']
) ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- 3. STORAGE POLICIES (RLS)
-- ==========================================

-- -------------------------------------------------------
-- Bucket: 'images'
-- -------------------------------------------------------

-- Policy: Public Read Access
CREATE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- Policy: Admin Full Access (Insert, Update, Delete)
CREATE POLICY "Admins can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'images' 
    AND (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
);

CREATE POLICY "Admins can update images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'images' 
    AND (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
);

CREATE POLICY "Admins can delete images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'images' 
    AND (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
);

-- -------------------------------------------------------
-- Bucket: 'audio'
-- -------------------------------------------------------

-- Policy: Public Read Access
CREATE POLICY "Audio is publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'audio' );

-- Policy: Admin Full Access
CREATE POLICY "Admins can manage audio"
ON storage.objects FOR ALL
USING (
    bucket_id = 'audio' 
    AND (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
);

-- -------------------------------------------------------
-- Bucket: 'downloads' (Private)
-- -------------------------------------------------------

-- Policy: No public access. Explicitly controlled by Signed URLs.
-- Only Admins can manage files here.

CREATE POLICY "Admins can manage downloads"
ON storage.objects FOR ALL
USING (
    bucket_id = 'downloads' 
    AND (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
);

-- Note: We do NOT need explicit policies for Signed URL access. 
-- Supabase manages that internally via tokens.
