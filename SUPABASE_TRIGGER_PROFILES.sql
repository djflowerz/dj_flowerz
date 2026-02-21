-- ==========================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==========================================
-- This script ensures that a profile is created in the public.profiles table
-- immediately when a new user signs up via Supabase Auth.

-- 1. Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, avatar_url, created_at, updated_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), 
    new.email, 
    'user',
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://ui-avatars.com/api/?name=User&background=random'),
    NOW(),
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the auth.users table
-- We use 'IF NOT EXISTS' logic by dropping first to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure the profiles table is in the realtime publication
-- (Rerun this part specifically for profiles)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 4. Sync existing users who might be missing profiles
INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'User'), email, 'user', created_at, updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
