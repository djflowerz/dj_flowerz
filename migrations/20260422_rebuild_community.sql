-- Minimal Community Fix
-- Add missing columns to support threads and descriptive notifications

-- 1. Pulse Hub Upgrades
ALTER TABLE pulses ADD COLUMN updated_at DATETIME;

-- 2. Notification Upgrades
ALTER TABLE notifications ADD COLUMN content TEXT;
