-- Migration to align production schema with local development
-- Adding missing columns to products table
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN compare_at_price REAL;
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE products ADD COLUMN release_date TEXT;
ALTER TABLE products ADD COLUMN logistics TEXT;
ALTER TABLE products ADD COLUMN slug TEXT;
ALTER TABLE products ADD COLUMN technical_details TEXT;
ALTER TABLE products ADD COLUMN hotspots TEXT;
ALTER TABLE products ADD COLUMN use_cases TEXT;
ALTER TABLE products ADD COLUMN variant_groups TEXT;

-- Adding missing columns to orders table
ALTER TABLE orders ADD COLUMN customer_name TEXT;
ALTER TABLE orders ADD COLUMN customer_email TEXT;
ALTER TABLE orders ADD COLUMN customer_phone TEXT;
ALTER TABLE orders ADD COLUMN city TEXT;
ALTER TABLE orders ADD COLUMN address TEXT;
ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN payment_method TEXT;
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN refund_status TEXT;
ALTER TABLE orders ADD COLUMN shipping_provider TEXT;
ALTER TABLE orders ADD COLUMN shipping_method TEXT;
ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0.0;
ALTER TABLE orders ADD COLUMN notes TEXT;
ALTER TABLE orders ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
