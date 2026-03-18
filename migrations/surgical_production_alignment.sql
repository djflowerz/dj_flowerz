-- Surgical migration to align production schema with local development
-- Products table updates
ALTER TABLE products ADD COLUMN inventory INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN technical_details TEXT;
ALTER TABLE products ADD COLUMN hotspots TEXT;
ALTER TABLE products ADD COLUMN use_cases TEXT;
ALTER TABLE products ADD COLUMN variant_groups TEXT;
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN compare_at_price REAL;
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE products ADD COLUMN release_date TEXT;
ALTER TABLE products ADD COLUMN logistics TEXT;
ALTER TABLE products ADD COLUMN slug TEXT;

-- Orders table updates
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN refund_status TEXT;
ALTER TABLE orders ADD COLUMN shipping_provider TEXT;
ALTER TABLE orders ADD COLUMN shipping_method TEXT;
ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0.0;
ALTER TABLE orders ADD COLUMN notes TEXT;
