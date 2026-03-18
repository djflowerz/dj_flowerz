-- Create product_variants table in production
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    name TEXT,
    sku TEXT UNIQUE,
    price DECIMAL(12, 2) NOT NULL,
    compare_at_price DECIMAL(12, 2),
    cost_price DECIMAL(12, 2),
    currency TEXT DEFAULT 'KES',
    inventory INTEGER DEFAULT 0, -- Note: using 'inventory' to match main products table naming if needed, though local schema used stock_quantity
    stock_quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT TRUE,
    weight DECIMAL(10, 2),
    image_url TEXT,
    metadata TEXT, -- Keeping as TEXT/JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_variant_product_id ON product_variants(product_id);
