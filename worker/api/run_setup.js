export async function handleSetupDB(request, env) {
    const stmts = [
        `CREATE TABLE IF NOT EXISTS coupons_new (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            scope TEXT DEFAULT 'all',
            discount_type TEXT DEFAULT 'percentage',
            discount_value REAL NOT NULL,
            min_spend REAL DEFAULT 0,
            expiry_date DATETIME,
            usage_limit INTEGER,
            usage_count INTEGER DEFAULT 0,
            is_one_time_per_user INTEGER DEFAULT 0,
            applicable_plans TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT OR IGNORE INTO coupons_new (id, code, discount_type, discount_value, min_spend, usage_limit, usage_count, expiry_date, is_active, created_at, updated_at)
         SELECT id, code, discount_type, discount_value, min_purchase, usage_limit, usage_count, expiry_date, is_active, created_at, created_at
         FROM coupons`,
        `DROP TABLE coupons`,
        `ALTER TABLE coupons_new RENAME TO coupons`,
        
        `CREATE TABLE IF NOT EXISTS installment_plans_new (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            product_id TEXT,
            product_name TEXT,
            total_amount REAL NOT NULL,
            deposit_amount REAL NOT NULL,
            paid_amount REAL NOT NULL DEFAULT 0,
            balance REAL NOT NULL,
            installments_count INTEGER NOT NULL DEFAULT 3,
            payment_interval TEXT DEFAULT 'monthly',
            status TEXT DEFAULT 'active',
            next_payment_date DATETIME,
            reminder_channel TEXT DEFAULT 'email',
            is_reminder_enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT OR IGNORE INTO installment_plans_new (id, order_id, user_id, total_amount, deposit_amount, balance, installments_count, payment_interval, status, next_payment_date, created_at)
         SELECT id, order_id, user_id, total_amount, deposit_amount, remaining_balance, installment_count, frequency, status, next_payment_date, start_date
         FROM installment_plans`,
        `DROP TABLE installment_plans`,
        `ALTER TABLE installment_plans_new RENAME TO installment_plans`,
        
        `DROP TABLE IF EXISTS affiliates`,
        `CREATE TABLE affiliates (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            full_name TEXT,
            email TEXT,
            phone_number TEXT,
            referral_code TEXT UNIQUE,
            commission_percent REAL DEFAULT 10.0,
            notes TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS referral_stats_new (
            referrer_id TEXT PRIMARY KEY,
            total_referrals INTEGER DEFAULT 0,
            total_earned REAL DEFAULT 0,
            pending_payout REAL DEFAULT 0,
            last_payout_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT OR IGNORE INTO referral_stats_new (referrer_id, total_referrals, total_earned)
         SELECT referrer_id, COALESCE(total_referrals, 0), COALESCE(total_earned_commission, 0)
         FROM referral_stats`,
        `INSERT OR IGNORE INTO referral_stats_new (referrer_id, total_referrals, total_earned)
         SELECT affiliate_id, conversion_count, 0
         FROM referral_stats`,
        `DROP TABLE referral_stats`,
        `ALTER TABLE referral_stats_new RENAME TO referral_stats`,
        
        `ALTER TABLE subscribers ADD COLUMN is_active INTEGER DEFAULT 1`,
        `ALTER TABLE subscribers ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
        `UPDATE subscribers SET is_active = CASE WHEN status = 'active' THEN 1 ELSE 0 END`,
        
        `ALTER TABLE newsletter_campaigns ADD COLUMN target_audience TEXT DEFAULT 'all'`,
        `ALTER TABLE profiles ADD COLUMN referral_code TEXT`,
        `ALTER TABLE profiles ADD COLUMN last_login DATETIME`,
        `ALTER TABLE profiles ADD COLUMN presence_status TEXT DEFAULT 'offline'`,
        `ALTER TABLE profiles ADD COLUMN last_seen DATETIME`,
        `ALTER TABLE profiles ADD COLUMN loyalty_points INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN daily_download_count INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN last_download_reset DATETIME DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE profiles ADD COLUMN username TEXT`,
        `ALTER TABLE profiles ADD COLUMN bio TEXT`,
        `ALTER TABLE profiles ADD COLUMN avatar_url TEXT`,
        `ALTER TABLE profiles ADD COLUMN location TEXT`,
        `CREATE TABLE IF NOT EXISTS escrow_orders (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            buyer_id TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'HELD',
            shipping_address TEXT,
            tracking_number TEXT,
            dispute_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            actor_id TEXT,
            actor_name TEXT,
            actor_avatar TEXT,
            type TEXT NOT NULL,
            target_id TEXT,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username)`,
        `UPDATE profiles SET username = 'djflowerz' WHERE email = 'ianmuriithiflowerz@gmail.com' AND (username IS NULL OR username = '')`
    ];

    let errs = [];
    let successes = 0;
    for (let s of stmts) {
        try {
           await env.DB.prepare(s).run();
           successes++;
        } catch (e) {
           errs.push({ stmt: s.substring(0, 50), error: e.message });
        }
    }
    return new Response(JSON.stringify({ success: true, total: stmts.length, successes, errors: errs }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
