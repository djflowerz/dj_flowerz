
-- Cloudflare D1 Schema for DJ Flowerz (Relational Data)

-- 1. Profiles
DROP TABLE IF EXISTS profiles;
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products
DROP TABLE IF EXISTS products;
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0.0,
    category TEXT,
    image TEXT,
    images TEXT,
    inventory INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    currency TEXT DEFAULT 'KES',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Mixtapes
DROP TABLE IF EXISTS mixtapes;
CREATE TABLE IF NOT EXISTS mixtapes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    genre TEXT,
    description TEXT,
    cover_image TEXT,
    audio_url TEXT,
    download_url TEXT,
    duration TEXT,
    tags TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    release_date TEXT,
    required_tier TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Subscription Plans
DROP TABLE IF EXISTS subscription_plans;
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL DEFAULT 0.0,
    period TEXT,
    features TEXT,
    link TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Orders
DROP TABLE IF EXISTS orders;
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id),
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    items TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Genres (Additional)
DROP TABLE IF EXISTS genres;
CREATE TABLE IF NOT EXISTS genres (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
