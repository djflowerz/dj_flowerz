-- ==========================================
-- Admin Fix for Profiles Table RLS
-- ==========================================

-- This policy allows any user who is an admin to update any user's profile.
-- It fixes the issue where an admin activating a user's plan via the "grant_pool"
-- action silently failed, leaving the user locked out of the music pool.
CREATE POLICY "Profiles updateable by admin" ON profiles FOR UPDATE USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
