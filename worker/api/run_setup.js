// worker/api/run_setup.js
export async function handleSetupDB(request, env) {
    const stmts = [
        // 1. PROFILES EXPANSION (Auth, Reputation, Wallet)
        `ALTER TABLE profiles ADD COLUMN password_hash TEXT`,
        `ALTER TABLE profiles ADD COLUMN shadow_salt TEXT`,
        `ALTER TABLE profiles ADD COLUMN m_pesa_number TEXT`,
        `ALTER TABLE profiles ADD COLUMN is_shadow_flagged INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN wallet_balance_kes REAL DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN total_deals INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN success_deals INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN avg_release_hours REAL DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN seller_tier TEXT DEFAULT 'bronze'`,
        `ALTER TABLE profiles ADD COLUMN avg_rating REAL DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN total_reviews INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN report_count INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN phone_verified INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN is_profile_private INTEGER DEFAULT 0`,

        // 2. MARKETPLACE LISTINGS
        `CREATE TABLE IF NOT EXISTS marketplace_listings (
            id TEXT PRIMARY KEY,
            seller_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            price_kes REAL NOT NULL,
            category TEXT,
            condition TEXT,
            location TEXT,
            image_urls TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // 3. ESCROW MESSAGES (P2P Deal Chat)
        `CREATE TABLE IF NOT EXISTS escrow_messages (
            id TEXT PRIMARY KEY,
            escrow_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            content TEXT NOT NULL,
            is_system INTEGER DEFAULT 0,
            attachment_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_escrow_messages_escrow_id ON escrow_messages(escrow_id)`,

        // 4. WALLET TRANSACTIONS AUDIT
        `CREATE TABLE IF NOT EXISTS wallet_transactions_new (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount_kes REAL NOT NULL,
            type TEXT NOT NULL, 
            escrow_id TEXT,
            status TEXT DEFAULT 'PENDING',
            payout_receipt_code TEXT,
            payout_admin_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Migration logic for wallet
        `INSERT OR IGNORE INTO wallet_transactions_new (id, user_id, amount_kes, type, escrow_id, status, created_at)
         SELECT id, user_id, amount_kes, type, escrow_id, status, created_at
         FROM wallet_transactions`,
        `DROP TABLE IF EXISTS wallet_transactions`,
        `ALTER TABLE wallet_transactions_new RENAME TO wallet_transactions`,

        // 5. ESCROW CORE REFINEMENT
        `CREATE TABLE IF NOT EXISTS escrow_transactions_new (
            id TEXT PRIMARY KEY,
            listing_id TEXT,
            buyer_id TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            amount_kes REAL NOT NULL,
            fee_kes REAL NOT NULL,
            seller_receives REAL NOT NULL,
            item_description TEXT,
            state TEXT DEFAULT 'PENDING',
            paystack_ref TEXT,
            tracking_number TEXT,
            shipping_carrier TEXT,
            release_code TEXT,
            release_attempts INTEGER DEFAULT 0,
            is_blocked INTEGER DEFAULT 0,
            dispute_reason TEXT,
            resolution_notes TEXT,
            inspection_end_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            funded_at DATETIME,
            shipped_at DATETIME,
            delivered_at DATETIME,
            released_at DATETIME,
            auto_release_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT OR IGNORE INTO escrow_transactions_new (id, listing_id, buyer_id, seller_id, amount_kes, fee_kes, seller_receives, item_description, state, paystack_ref, tracking_number, shipping_carrier, dispute_reason, resolution_notes, created_at, updated_at)
         SELECT id, listing_id, buyer_id, seller_id, amount_kes, fee_kes, seller_receives, item_description, state, paystack_ref, tracking_number, shipping_carrier, dispute_reason, resolution_notes, created_at, updated_at
         FROM escrow_transactions`,
        `DROP TABLE IF EXISTS escrow_transactions`,
        `ALTER TABLE escrow_transactions_new RENAME TO escrow_transactions`,

        // 6. REPUTATION & LOGS
        `CREATE TABLE IF NOT EXISTS user_reports (
            id TEXT PRIMARY KEY,
            reporter_id TEXT NOT NULL,
            reported_id TEXT NOT NULL,
            escrow_id TEXT,
            reason TEXT NOT NULL,
            details TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // 7. NOTIFICATIONS SCHEMA FIX
        `CREATE TABLE IF NOT EXISTS notifications_new (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            actor_id TEXT,
            actor_name TEXT,
            actor_avatar TEXT,
            actor_username TEXT,
            type TEXT NOT NULL,
            reference_id TEXT,
            target_id TEXT,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT OR IGNORE INTO notifications_new (id, user_id, type, reference_id, message, is_read, created_at)
         SELECT id, user_id, type, reference_id, message, is_read, created_at
         FROM notifications`,
        `DROP TABLE IF EXISTS notifications`,
        `ALTER TABLE notifications_new RENAME TO notifications`,

        // 8. ADMIN & SYSTEM SECURITY
        `CREATE TABLE IF NOT EXISTS admin_logs (
            id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            reference_id TEXT,
            before_state TEXT,
            after_state TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('MAINTENANCE_MODE', '0', 'Global Kill Switch')`,

        // 9. PWA & PUSH NOTIFICATIONS
        `CREATE TABLE IF NOT EXISTS push_subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            device_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        \`CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_user_endpoint ON push_subscriptions(user_id, endpoint)\`,

        // 10. SOCIAL ENGINE RE-ARCHITECTURE
        \`CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            author_id TEXT NOT NULL,
            content TEXT,
            media_urls TEXT,
            post_type TEXT NOT NULL DEFAULT 'post',
            quote_of_id TEXT REFERENCES posts(id),
            reply_to_id TEXT REFERENCES posts(id),
            thread_root_id TEXT REFERENCES posts(id),
            like_count INTEGER NOT NULL DEFAULT 0,
            reshare_count INTEGER NOT NULL DEFAULT 0,
            comment_count INTEGER NOT NULL DEFAULT 0,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )\`,
        \`CREATE INDEX IF NOT EXISTS idx_posts_author     ON posts(author_id, created_at DESC)\`,
        \`CREATE INDEX IF NOT EXISTS idx_posts_feed       ON posts(is_deleted, post_type, created_at DESC)\`,
        \`CREATE INDEX IF NOT EXISTS idx_posts_reply      ON posts(reply_to_id, created_at ASC)\`,
        \`CREATE INDEX IF NOT EXISTS idx_posts_thread     ON posts(thread_root_id, created_at ASC)\`,
        \`CREATE INDEX IF NOT EXISTS idx_posts_quote      ON posts(quote_of_id)\`,

        \`CREATE TABLE IF NOT EXISTS post_likes (
            post_id    TEXT NOT NULL REFERENCES posts(id),
            user_id    TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (post_id, user_id)
        )\`,
        \`CREATE INDEX IF NOT EXISTS idx_likes_user ON post_likes(user_id)\`,

        \`CREATE TABLE IF NOT EXISTS follows (
            follower_id  TEXT NOT NULL,
            following_id TEXT NOT NULL,
            created_at   TEXT NOT NULL,
            PRIMARY KEY (follower_id, following_id)
        )\`,
        \`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)\`,
        \`CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id)\`,

        \`CREATE TABLE IF NOT EXISTS activity_events (
            id          TEXT PRIMARY KEY,
            actor_id    TEXT NOT NULL,
            event_type  TEXT NOT NULL,
            target_id   TEXT,
            subject_id  TEXT,
            created_at  TEXT NOT NULL
        )\`,
        \`CREATE INDEX IF NOT EXISTS idx_activity_actor   ON activity_events(actor_id, created_at DESC)\`,
        \`CREATE INDEX IF NOT EXISTS idx_activity_subject ON activity_events(subject_id, created_at DESC)\`,
        \`CREATE INDEX IF NOT EXISTS idx_activity_type    ON activity_events(event_type, created_at DESC)\`,

        \`CREATE VIEW IF NOT EXISTS user_profiles AS SELECT id, username, name as display_name, avatar_url FROM profiles\`
    ];

    let errs = [];
    let successes = 0;
    for (let s of stmts) {
        try {
           await env.DB.prepare(s).run();
           successes++;
        } catch (e) {
           if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
               errs.push({ stmt: s.substring(0, 50), error: e.message });
           } else {
               successes++;
           }
        }
    }
    return new Response(JSON.stringify({ 
        success: true, 
        total: stmts.length, 
        successes, 
        errors: errs 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
