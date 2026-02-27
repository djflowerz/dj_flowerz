-- ==========================================
-- Sync Existing Active Subscriptions to Profiles
-- ==========================================

-- This script finds all users who have an "active" subscription in the 
-- `subscriptions` table (whose expiration date is in the future) 
-- and ensures their `profiles` record has `is_subscriber = true`.

UPDATE profiles
SET 
    is_subscriber = true,
    subscription_plan = sub.plan_id,
    subscription_expiry = CAST(sub.expiry_date AS TIMESTAMPTZ)
FROM subscriptions sub
WHERE profiles.id = sub.user_id
  AND sub.status = 'active'
  AND CAST(sub.expiry_date AS TIMESTAMPTZ) > NOW()
  AND (profiles.is_subscriber = false OR profiles.is_subscriber IS NULL);
