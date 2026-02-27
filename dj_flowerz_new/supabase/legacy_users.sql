-- Legacy Profiles Table (No Auth Link)
CREATE TABLE IF NOT EXISTS profiles_legacy (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
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
ALTER TABLE profiles_legacy ENABLE ROW LEVEL SECURITY;

-- Admin can see all legacy profiles
CREATE POLICY "Admins can view legacy profiles" ON profiles_legacy FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Public read for emails (optional, same as profiles)
CREATE POLICY "Public legacy profiles viewable" ON profiles_legacy FOR SELECT USING (true);
