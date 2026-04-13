-- Community Feed & Social Features
CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    is_marketplace INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    escrow_status TEXT DEFAULT 'none', -- 'none', 'pending_payment', 'held_in_escrow', 'shipped', 'completed', 'disputed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_likes (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

-- Escrow Transactions / Private Marketplace Deals
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    fee_amount INTEGER NOT NULL, -- DJ Flowerz 5-7% cut
    status TEXT NOT NULL DEFAULT 'escrow_held', -- escrow_held, shipped, buyer_confirmed, admin_dispute, released, refunded
    buyer_evidence_url TEXT,
    seller_evidence_url TEXT,
    tracking_number TEXT,
    shipping_company TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_ratings (
    id TEXT PRIMARY KEY,
    rater_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rater_id, transaction_id)
);
