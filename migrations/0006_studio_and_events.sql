-- Migration 006: Studio Sessions (Hourly) & Event Bookings (Daily) + Mixtape Analytics

-- 1. Studio Sessions (Hourly)
CREATE TABLE IF NOT EXISTS studio_sessions (
  id                TEXT PRIMARY KEY,
  dj_id             TEXT REFERENCES users(id),
  customer_email    TEXT,                         -- fallback if guest or needed for Paystack
  session_date      TEXT NOT NULL,                -- ISO Date (YYYY-MM-DD)
  start_time        TEXT NOT NULL,                -- e.g., '14:00'
  duration_hours    INTEGER DEFAULT 1,
  extras            TEXT DEFAULT '[]',            -- JSON array of add-ons (Engineer, Video)
  total_price_kes   REAL,
  status            TEXT DEFAULT 'pending',       -- pending, paid, completed, cancelled
  paystack_ref      TEXT UNIQUE,
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_studio_sessions_date ON studio_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_studio_sessions_status ON studio_sessions(status);

-- 2. Event Gigs (Daily)
CREATE TABLE IF NOT EXISTS event_gigs (
  id                TEXT PRIMARY KEY,
  client_id         TEXT REFERENCES users(id),    -- internal user if registered
  client_name       TEXT,
  client_email      TEXT,
  event_date        TEXT UNIQUE NOT NULL,         -- Prevents double-booking you on one day
  event_type        TEXT,                         -- Wedding, Club, Corporate, etc.
  location_details  TEXT,
  guests_estimate   INTEGER,
  requirements      TEXT,                         -- Sound, Lighting, etc.
  quote_amount      REAL,
  deposit_received  REAL DEFAULT 0.0,
  status            TEXT DEFAULT 'inquiry',       -- inquiry, quoted, confirmed, completed
  paystack_ref      TEXT UNIQUE,
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_gigs_date ON event_gigs(event_date);
CREATE INDEX IF NOT EXISTS idx_event_gigs_status ON event_gigs(status);

-- 3. Mixtape Analytics Enhancements
-- SQLite allows adding columns. If they already exist, we ignore the error in D1 or use a safer approach.
-- Since D1 migration runner doesn't have a clean 'IF NOT EXISTS' for columns, 
-- we include these as separate statements.
ALTER TABLE mixtapes ADD COLUMN play_count INTEGER DEFAULT 0;
ALTER TABLE mixtapes ADD COLUMN download_count INTEGER DEFAULT 0;
ALTER TABLE mixtapes ADD COLUMN unique_listeners INTEGER DEFAULT 0;
