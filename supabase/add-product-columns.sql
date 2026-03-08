-- Add missing columns to products table for DJ Flowerz
ALTER TABLE products ADD COLUMN discount_price REAL DEFAULT 0.0;
ALTER TABLE products ADD COLUMN compare_at_price REAL DEFAULT 0.0;
ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'physical';
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN release_date TEXT;
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'draft';
ALTER TABLE products ADD COLUMN requires_shipping BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN weight REAL;
ALTER TABLE products ADD COLUMN dimensions TEXT;
ALTER TABLE products ADD COLUMN sku TEXT;
ALTER TABLE products ADD COLUMN variant_groups TEXT; -- JSON string
ALTER TABLE products ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN is_free BOOLEAN DEFAULT FALSE;
