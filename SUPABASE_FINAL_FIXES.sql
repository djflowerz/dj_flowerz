-- ==========================================
-- COMPREHENSIVE DATABASE FIXES & SECURITY
-- ==========================================

-- 1. FIX: Genre Alignment (Array Append Syntax Fix)
-- --------------------------------------------------

-- 1.1 Kenyan Love Songs
UPDATE pool_tracks 
SET genre = 'Kenyan Love Songs (Low Hype)',
    category = array_replace(category, 'Kenya Love Songs (Low Hype)', 'Kenyan Love Songs (Low Hype)')
WHERE genre = 'Kenya Love Songs (Low Hype)' OR category @> ARRAY['Kenya Love Songs (Low Hype)'];

UPDATE pool_tracks 
SET genre = 'Kenyan Love Songs Hype',
    category = array_replace(category, 'Kenya Love Songs (Hype)', 'Kenyan Love Songs Hype')
WHERE genre = 'Kenya Love Songs (Hype)' OR category @> ARRAY['Kenya Love Songs (Hype)'];

-- 1.2 Kikuyu Gospel (Kigocco)
UPDATE pool_tracks 
SET genre = 'Kikuyu Gospel (Kigocco)',
    category = array_replace(category, 'Kikuyu Gospel (Kigoco)', 'Kikuyu Gospel (Kigocco)')
WHERE genre = 'Kikuyu Gospel (Kigoco)' OR category @> ARRAY['Kikuyu Gospel (Kigoco)'];

-- 1.3 Bongo TBT
UPDATE pool_tracks 
SET genre = 'Bongo Flava (TBT) Hype',
    category = array_replace(category, 'Bongo Flava (TBT) (TZ) Hype', 'Bongo Flava (TBT) Hype')
WHERE genre = 'Bongo Flava (TBT) (TZ) Hype' OR category @> ARRAY['Bongo Flava (TBT) (TZ) Hype'];

UPDATE pool_tracks 
SET genre = 'Bongo TBT Low Hype',
    category = array_replace(category, 'Bongo Flava (TBT) (TZ)Low Hype', 'Bongo TBT Low Hype')
WHERE genre = 'Bongo Flava (TBT) (TZ)Low Hype' OR category @> ARRAY['Bongo Flava (TBT) (TZ)Low Hype'];

-- 1.4 Afro Beats
UPDATE pool_tracks 
SET genre = 'Afro Beats (TBT)',
    category = array_replace(category, 'Afrobeats (TBT)', 'Afro Beats (TBT)')
WHERE genre = 'Afrobeats (TBT)' OR category @> ARRAY['Afrobeats (TBT)'];

-- 1.5 Afrohouse (Correct Array Append)
UPDATE pool_tracks
SET genre = 'Afrohouse',
    category = array_append(category, 'Afrohouse')
WHERE (title ILIKE '%House Remix%' OR title ILIKE '%Afro House%' OR title ILIKE '%Afrohouse%')
AND NOT (category @> ARRAY['Afrohouse']);

-- 1.6 Afro Amapiano DANCEHALL REFIX (Correct Array Append)
UPDATE pool_tracks
SET category = array_append(category, 'Afro Amapiano DANCEHALL REFIX')
WHERE (genre = 'REMIXAH' OR genre = 'DANCEHALL REFIX') 
AND title ILIKE '%Amapiano%' 
AND NOT (category @> ARRAY['Afro Amapiano DANCEHALL REFIX']);


-- 2. SECURITY: Search Path Hardening
-- --------------------------------------------------
-- Protects against hijacking of SECURITY DEFINER functions
ALTER FUNCTION public.issue_referral_reward SET search_path = public;
ALTER FUNCTION public.handle_new_user SET search_path = public;


-- 3. SECURITY: RLS Policy Hardening
-- --------------------------------------------------
-- Prevent spam on newsletter_subscribers with basic email validation
DROP POLICY IF EXISTS "Public can subscribe" ON newsletter_subscribers;
CREATE POLICY "Public can subscribe" 
ON newsletter_subscribers 
FOR INSERT 
WITH CHECK (
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);


-- 4. PERFORMANCE: Recommended Missing Indexes
-- --------------------------------------------------
-- Optimize queries for tracking, products, and user lookups
CREATE INDEX IF NOT EXISTS idx_pool_tracks_genre_category ON pool_tracks USING GIN (category);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status ON subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
