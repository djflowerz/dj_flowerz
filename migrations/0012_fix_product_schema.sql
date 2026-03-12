-- Migration: 0012_fix_product_schema.sql
-- Description: Add missing columns to products_new and product_variants for better frontend-backend synchronization.

-- 1. Add missing columns to products_new
ALTER TABLE products_new ADD COLUMN brand TEXT;
ALTER TABLE products_new ADD COLUMN type TEXT DEFAULT 'physical';
ALTER TABLE products_new ADD COLUMN release_date DATETIME;
ALTER TABLE products_new ADD COLUMN image_url TEXT;
ALTER TABLE products_new ADD COLUMN short_description TEXT;
ALTER TABLE products_new ADD COLUMN visibility TEXT DEFAULT 'public';
ALTER TABLE products_new ADD COLUMN status TEXT DEFAULT 'published';
ALTER TABLE products_new ADD COLUMN tag_list TEXT; -- For flat tags storage if needed
ALTER TABLE products_new ADD COLUMN os TEXT;
ALTER TABLE products_new ADD COLUMN requires_shipping BOOLEAN DEFAULT TRUE;
ALTER TABLE products_new ADD COLUMN track_stock BOOLEAN DEFAULT TRUE;
ALTER TABLE products_new ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT TRUE;

-- 2. Add missing fields to product_variants (for currency and comparison)
-- Note: product_variants already has many of these, but ensuring consistency
-- ALTER TABLE product_variants ADD COLUMN currency TEXT DEFAULT 'KES'; -- Already exists in 0011
