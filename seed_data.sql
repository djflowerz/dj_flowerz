-- Seed data for DJ Flowerz (nxtbn modular store)

-- 1. Categories
INSERT INTO categories (id, name, slug, description) VALUES 
('cat_1', 'Service Packs', 'service-packs', 'Premium tracks and redrums for DJs'),
('cat_2', 'Merchandise', 'merchandise', 'Official DJ Flowerz apparel and gear'),
('cat_3', 'Digital Downloads', 'digital-downloads', 'Exclusive mixtapes and sounds');

-- 2. Product Types
INSERT INTO product_types (id, name, has_variants, is_shipping_required, is_digital) VALUES 
('type_1', 'Digital Track', 0, 0, 1),
('type_2', 'Apparel', 1, 1, 0);

-- 3. Products
INSERT INTO products_new (id, name, slug, description, category_id, product_type_id, is_active, is_featured) VALUES 
('prod_1', 'March 2024 Service Pack', 'march-2024-service-pack', 'Latest redrums and edits for March.', 'cat_1', 'type_1', 1, 1),
('prod_2', 'DJ Flowerz Official Tee', 'dj-flowerz-tee', 'High quality cotton t-shirt.', 'cat_2', 'type_2', 1, 1);

-- 4. Product Variants
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, track_inventory) VALUES 
('var_1', 'prod_1', 'Standard Digital', 'SKU-SP-MAR24', 1500.00, 999, 0),
('var_2', 'prod_2', 'Black / Large', 'SKU-TEE-BLK-L', 2500.00, 50, 1),
('var_3', 'prod_2', 'Black / Medium', 'SKU-TEE-BLK-M', 2500.00, 30, 1);

-- 5. Store Settings
INSERT OR IGNORE INTO store_settings (key, value) VALUES 
('siteConfig', '{"siteName":"DJ FLOWERZ","tagline":"Premium Music Experience","adminEmail":"ianmuriithiflowerz@gmail.com"}');

-- 6. Mixtapes
INSERT INTO mixtapes (id, title, slug, genre, description, status, cover_image) VALUES 
('mix_1', 'The Flow Vol 1', 'the-flow-vol-1', 'Afrohouse', 'Energetic mix of latest afrohouse hits.', 'published', 'https://via.placeholder.com/600'),
('mix_2', 'Redrum Sessions', 'redrum-sessions', 'Bongo', 'Exclusive bongo redrums and blends.', 'published', 'https://via.placeholder.com/600');
