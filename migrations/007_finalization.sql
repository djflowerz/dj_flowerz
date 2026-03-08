-- Migration: 007_finalization.sql
-- Security & Cleanup

ALTER TABLE users ADD COLUMN last_ip TEXT;
ALTER TABLE users ADD COLUMN device_fingerprint TEXT;

-- Index for fingerprint guard
CREATE INDEX IF NOT EXISTS idx_users_fingerprint ON users(device_fingerprint);

-- Add support for account reset logs
CREATE TABLE IF NOT EXISTS system_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component TEXT,
    status TEXT,
    last_check DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);
