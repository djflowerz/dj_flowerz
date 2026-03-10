-- Migration: 0011_nxtbn_store_migration.sql
-- Description: Restructure store and admin using nxtbn-inspired modular schema.

-- 1. Categories (Parent/Child)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Types
CREATE TABLE IF NOT EXISTS product_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    has_variants BOOLEAN DEFAULT FALSE,
    is_shipping_required BOOLEAN DEFAULT TRUE,
    is_digital BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products
-- Note: 'inventory' and 'variants' JSON from old schema will be migrated to product_variants.
CREATE TABLE IF NOT EXISTS products_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    product_type_id TEXT REFERENCES product_types(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    meta_title TEXT,
    meta_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products_new(id) ON DELETE CASCADE,
    name TEXT, -- e.g., 'Large', 'Blue'
    sku TEXT UNIQUE,
    price DECIMAL(12, 2) NOT NULL,
    compare_at_price DECIMAL(12, 2),
    cost_price DECIMAL(12, 2),
    currency TEXT DEFAULT 'KES',
    stock_quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT TRUE,
    weight DECIMAL(10, 2), -- in KG or Grams
    image_url TEXT,
    metadata JSON, -- For complex variant options
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Orders (Refactored)
CREATE TABLE IF NOT EXISTS orders_new (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
    payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid', 'refunded'
    currency TEXT DEFAULT 'KES',
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_address_id TEXT, -- Future expansion
    billing_address_id TEXT, -- Future expansion
    payment_method TEXT,
    paystack_reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Order Line Items
CREATE TABLE IF NOT EXISTS order_line_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders_new(id) ON DELETE CASCADE,
    variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL, -- Snapshot at time of order
    variant_name TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Kenya',
    postal_code TEXT,
    is_default_billing BOOLEAN DEFAULT FALSE,
    is_default_shipping BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update 'updated_at' (Standard SQLite pattern is to handle in code or triggers)
-- For D1, we usually handles updated_at in the worker logic or via triggers if D1 supports them well.
