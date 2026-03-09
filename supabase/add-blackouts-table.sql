
-- Pro Feature 2: Gig Manager & Blackout Dates
-- This table stores dates that are unavailable for booking.

CREATE TABLE IF NOT EXISTS blackouts (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL, -- Format: YYYY-MM-DD
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
