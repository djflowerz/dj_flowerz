-- Migration: 0010_api_consolidation.sql
-- Description: Create tables for reviews, studio locations, gear, and mixtape comments to replace hardcoded mock data.

-- Product Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Studio Locations Table
CREATE TABLE IF NOT EXISTS studio_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate INTEGER NOT NULL, -- Hourly rate in KES
    description TEXT,
    features TEXT, -- JSON string of features
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Studio Gear Table
CREATE TABLE IF NOT EXISTS studio_gear (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hourly_rate INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL, -- e.g., Microphone, Headphones, Mixer
    image_url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mixtape Comments Table
CREATE TABLE IF NOT EXISTS mixtape_comments (
    id TEXT PRIMARY KEY,
    mixtape_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_mixtape_comments_mixtape_id ON mixtape_comments(mixtape_id);

-- Seeding Initial Data from hardcoded constants (Optional but helpful for transition)
-- Note: In a real migration, we'd ensure IDs match what the frontend expects or update frontend to use IDs.

INSERT OR IGNORE INTO studio_locations (id, name, rate, description, features, image_url) VALUES 
('main-studio', 'Main Studio (Nairobi)', 2000, 'Our flagship studio with high-end acoustics.', '["Fully Soundproof", "Vocal Booth", "Lounge Area"]', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1200'),
('home-setup', 'Home Setup (Mobile)', 1000, 'Professional mobile setup delivered to your location.', '["Portable", "Fast Setup", "Great for Podcasts"]', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=1200');

INSERT OR IGNORE INTO studio_gear (id, name, hourly_rate, category, image_url) VALUES 
('mic-u87', 'Neumann U87', 500, 'Microphone', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=400'),
('video-4k', '4K Multi-cam Video', 1000, 'Video', 'https://images.unsplash.com/photo-1533444922611-051528439ac3?auto=format&fit=crop&q=80&w=400');
