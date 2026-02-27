-- ==========================================
-- REFERRAL SYSTEM SETUP
-- Tables: referral_logs, referral_stats
-- Function: issue_referral_reward (Security Definer)
-- ==========================================

-- 1. Create referral_logs table
CREATE TABLE IF NOT EXISTS referral_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id),
  referee_id UUID REFERENCES auth.users(id),
  referrer_name TEXT,
  referee_name TEXT,
  plan_purchased TEXT,
  discount_applied NUMERIC,
  reward_amount NUMERIC,
  reward_issued BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE referral_logs ENABLE ROW LEVEL SECURITY;

-- Policies for referral_logs
-- Referrers can view their own logs
DROP POLICY IF EXISTS "Referral logs viewable by referrer" ON referral_logs;
CREATE POLICY "Referral logs viewable by referrer" ON referral_logs FOR SELECT USING (auth.uid() = referrer_id);

-- Admins can view all logs
DROP POLICY IF EXISTS "Referral logs viewable by admin" ON referral_logs;
CREATE POLICY "Referral logs viewable by admin" ON referral_logs FOR SELECT USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- 2. Create referral_stats table
CREATE TABLE IF NOT EXISTS referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE, -- One stats entry per user
  user_name TEXT,
  referral_code TEXT,
  total_referrals INTEGER DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  pending_payout NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

-- Policies for referral_stats
-- Users can view their own stats
DROP POLICY IF EXISTS "Referral stats viewable by owner" ON referral_stats;
CREATE POLICY "Referral stats viewable by owner" ON referral_stats FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all stats
DROP POLICY IF EXISTS "Referral stats viewable by admin" ON referral_stats;
CREATE POLICY "Referral stats viewable by admin" ON referral_stats FOR SELECT USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- 3. Create Function to Issue Reward Securely
-- This function runs with SECURITY DEFINER privileges (bypassing RLS)
CREATE OR REPLACE FUNCTION issue_referral_reward(
  referrer_id UUID,
  referee_id UUID,
  referrer_name TEXT,
  referee_name TEXT,
  plan_purchased TEXT,
  discount_applied NUMERIC,
  reward_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  current_referrer_code TEXT;
BEGIN
  -- Fetch referrer's referral code for the stats table
  SELECT referral_code INTO current_referrer_code FROM profiles WHERE id = referrer_id;

  -- 1. Insert into referral_logs
  INSERT INTO referral_logs (
    referrer_id, 
    referee_id, 
    referrer_name, 
    referee_name, 
    plan_purchased, 
    discount_applied, 
    reward_amount, 
    reward_issued, 
    status
  )
  VALUES (
    referrer_id, 
    referee_id, 
    referrer_name, 
    referee_name, 
    plan_purchased, 
    discount_applied, 
    reward_amount, 
    TRUE, 
    'completed'
  );

  -- 2. Update referrer's balance in profiles
  UPDATE profiles
  SET 
    balance = COALESCE(balance, 0) + reward_amount,
    updated_at = NOW()
  WHERE id = referrer_id;

  -- 3. Update or Insert referral_stats
  INSERT INTO referral_stats (
    user_id, 
    user_name, 
    referral_code,
    total_referrals, 
    total_earned
  )
  VALUES (
    referrer_id, 
    referrer_name, 
    current_referrer_code,
    1, 
    reward_amount
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_referrals = referral_stats.total_referrals + 1,
    total_earned = referral_stats.total_earned + EXCLUDED.total_earned,
    user_name = EXCLUDED.user_name, -- Update name in case it changed
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
