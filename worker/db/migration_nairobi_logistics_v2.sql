-- Refined Migration for Nairobi Logistics Engine
-- Skips columns that might already exist (loyalty_points_earned).

-- [PRODUCTS] Add manual tiered pricing fields
ALTER TABLE products ADD COLUMN price_local REAL;
ALTER TABLE products ADD COLUMN price_air REAL;
ALTER TABLE products ADD COLUMN price_sea REAL;

-- [ORDERS] Add dispatch tracking
ALTER TABLE orders ADD COLUMN sacco_name TEXT;
ALTER TABLE orders ADD COLUMN vehicle_plate TEXT;
ALTER TABLE orders ADD COLUMN driver_phone TEXT;
ALTER TABLE orders ADD COLUMN dispatch_status TEXT DEFAULT 'pending';
