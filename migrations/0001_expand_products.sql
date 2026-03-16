-- Add missing advanced fields to products table
ALTER TABLE products ADD COLUMN technical_details TEXT;
ALTER TABLE products ADD COLUMN hotspots TEXT;
ALTER TABLE products ADD COLUMN use_cases TEXT;
ALTER TABLE products ADD COLUMN variant_groups TEXT;
