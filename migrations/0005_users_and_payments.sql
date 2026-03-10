-- Migration 005: Users (D1 unified store) + Payments (webhook log) + admin_logs
-- Safe to run repeatedly: all statements use IF NOT EXISTS.

-- ── Users Table ──────────────────────────────────────────────────────────────
-- Single source of truth for subscriber status and referral system.
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,             -- internal UUID
  supabase_id           TEXT UNIQUE,                  -- from Supabase auth.users
  email                 TEXT UNIQUE NOT NULL,
  full_name             TEXT,
  phone_number          TEXT,                         -- cleaned format for WhatsApp

  -- Music Pool Access
  is_subscriber         INTEGER DEFAULT 0,            -- 1 = active DJ
  subscription_end_date TEXT,                         -- ISO datetime

  -- Referral & Rewards
  referral_balance_kes  REAL    DEFAULT 0.0,
  referral_code         TEXT    UNIQUE,               -- e.g. DJ7X2K
  referral_earned_days  INTEGER DEFAULT 0,

  -- Analytics
  download_count_today  INTEGER DEFAULT 0,
  last_login            TEXT    DEFAULT (datetime('now')),
  created_at            TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_supabase   ON users(supabase_id);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscriber ON users(is_subscriber);

-- ── Payments Table ────────────────────────────────────────────────────────────
-- Every verified Paystack charge.success event is logged here.
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,   -- Paystack reference (globally unique)
  customer_email  TEXT NOT NULL,
  amount_kes      REAL NOT NULL,
  channel         TEXT,               -- 'card', 'mobile_money', 'bank'
  currency        TEXT DEFAULT 'KES',
  verified_sig    INTEGER DEFAULT 1,  -- always 1 here (we reject unverified)
  metadata        TEXT DEFAULT '{}',  -- raw JSON for auditing
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_email      ON payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- ── Admin Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action      TEXT NOT NULL,
  details     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time   ON admin_logs(created_at);
