import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 1. PROFILES (Unified user data)
export const profiles = sqliteTable('profiles', {
    id: text('id').primaryKey(),
    email: text('email').unique().notNull(),
    fullName: text('full_name'),
    role: text('role').default('user'),
    avatarUrl: text('avatar_url'),
    phoneNumber: text('phone_number'),
    supabaseId: text('supabase_id'),
    isSubscriber: integer('is_subscriber', { mode: 'boolean' }).default(false),
    subscriptionPlan: text('subscription_plan'),
    subscriptionExpiry: text('subscription_expiry'),
    hasUsedTrial: integer('has_used_trial', { mode: 'boolean' }).default(false),
    referralCode: text('referral_code'),
    referralBy: text('referral_by'),
    referralBalance: real('referral_balance').default(0),
    referralEarnedDays: integer('referral_earned_days').default(0),
    balance: real('balance').default(0),
    dailyDownloadCount: integer('daily_download_count').default(0),
    lastDownloadReset: text('last_download_reset'),
    lastIp: text('last_ip'),
    deviceFingerprint: text('device_fingerprint'),
    lastLogin: text('last_login'),
    presenceStatus: text('presence_status').default('offline'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 2. PRODUCTS (Consolidated)
export const products = sqliteTable('products', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    price: real('price').notNull(),
    currency: text('currency').default('KES'),
    category: text('category'),
    image: text('image'),
    images: text('images'), // Store as JSON string
    stock: integer('stock').default(0),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    rating: real('rating').default(0),
    reviewsCount: integer('reviews_count').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 3. MIXTAPES
export const mixtapes = sqliteTable('mixtapes', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    coverUrl: text('cover_url'),
    audioUrl: text('audio_url'),
    videoUrl: text('video_url'),
    duration: text('duration'),
    releaseDate: text('release_date'),
    category: text('category'),
    isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
    showInGallery: integer('show_in_gallery', { mode: 'boolean' }).default(true),
    showInMusicPool: integer('show_in_music_pool', { mode: 'boolean' }).default(false),
    playCount: integer('play_count').default(0),
    downloadCount: integer('download_count').default(0),
    requiredTier: text('required_tier').default('free'),
    tags: text('tags'), // Comma-separated or JSON string
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 4. ORDERS
export const orders = sqliteTable('orders', {
    id: text('id').primaryKey(),
    customerId: text('customer_id').references(() => profiles.id),
    customerEmail: text('customer_email'),
    customerName: text('customer_name'),
    totalAmount: real('total_amount').notNull(),
    status: text('status').default('pending'), // pending, paid, shipped, delivered, cancelled
    paymentStatus: text('payment_status').default('pending'),
    paymentMethod: text('payment_method'),
    referenceCode: text('reference_code'),
    paystackRef: text('paystack_ref'),
    items: text('items').notNull(), // JSON string: Array of {id, name, price, quantity}
    shippingAddress: text('shipping_address'),
    city: text('city'),
    phoneNumber: text('phone_number'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 5. INTERACTIONS (Reviews & Comments)
export const interactions = sqliteTable('interactions', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => profiles.id),
    userName: text('user_name'),
    targetId: text('target_id').notNull(), // Can be productId or mixtapeId
    targetType: text('target_type').notNull(), // 'product' | 'mixtape'
    type: text('type').notNull(), // 'review' | 'comment'
    content: text('content').notNull(),
    rating: integer('rating'), // Only for reviews
    status: text('status').default('approved'), // pending, approved, hidden
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 6. SETTINGS (Key-Value)
export const settings = sqliteTable('settings', {
    id: text('id').primaryKey(),
    key: text('key').unique().notNull(),
    value: text('value').notNull(), // JSON string
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 7. BLACKOUTS
export const blackouts = sqliteTable('blackouts', {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    reason: text('reason').default('Gig Confirmed'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 8. ADMIN LOGS
export const adminLogs = sqliteTable('admin_logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    action: text('action').notNull(),
    details: text('details'),
    adminId: text('admin_id'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 9. REFERRALS
export const referrals = sqliteTable('referrals', {
    id: text('id').primaryKey(),
    referrerId: text('referrer_id').references(() => profiles.id),
    referredId: text('referred_id').references(() => profiles.id),
    status: text('status').default('pending'), // pending, completed
    rewardAmount: real('reward_amount').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 10. SUBSCRIPTIONS (Plan details)
export const subscriptions = sqliteTable('subscriptions', {
    id: text('id').primaryKey(), // plan name/id (e.g. silver, gold)
    name: text('name').notNull(),
    price: real('price').notNull(),
    durationDays: integer('duration_days').notNull(),
    features: text('features'), // JSON string
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 11. COUPONS
export const coupons = sqliteTable('coupons', {
    code: text('code').primaryKey(),
    description: text('description'),
    scope: text('scope').default('all'), // all, tracks, mixtapes
    discountType: text('discount_type').notNull(), // percentage, fixed
    discountValue: real('discount_value').notNull(),
    minSpend: real('min_spend').default(0),
    expiryDate: text('expiry_date'),
    usageLimit: integer('usage_limit'), // total max uses
    isOneTimePerUser: integer('is_one_time_per_user', { mode: 'boolean' }).default(false),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    createdByRefUserId: text('created_by_ref_user_id'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 12. COUPON USAGE
export const couponUsage = sqliteTable('coupon_usage', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    couponCode: text('coupon_code').references(() => coupons.code),
    userId: text('user_id').references(() => profiles.id),
    orderId: text('order_id').references(() => orders.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 13. STUDIO SESSIONS
export const studioSessions = sqliteTable('studio_sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => profiles.id),
    sessionDate: text('session_date').notNull(),
    duration: integer('duration').notNull(), // in hours
    status: text('status').default('pending'), // pending, paid, cancelled
    totalAmount: real('total_amount'),
    paystackRef: text('paystack_ref'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 14. SUBSCRIBERS (Newsletter)
export const subscribers = sqliteTable('subscribers', {
    email: text('email').primaryKey(),
    fullName: text('full_name'),
    tags: text('tags'), // JSON string
    status: text('status').default('active'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 15. SUPPORT TICKETS
export const supportTickets = sqliteTable('support_tickets', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => profiles.id),
    customerName: text('customer_name'),
    customerEmail: text('customer_email'),
    customerPhone: text('customer_phone'),
    subject: text('subject').notNull(),
    messageContent: text('message_content').notNull(),
    source: text('source').default('web'),
    status: text('status').default('open'), // open, closed
    priority: text('priority').default('normal'),
    adminNotes: text('admin_notes'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
// 16. TRACKS (Music Pool)
export const tracks = sqliteTable('tracks', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    artist: text('artist'),
    genre: text('genre'),
    subGenre: text('sub_genre'),
    displayGenre: text('display_genre'),
    collectionHub: text('collection_hub'),
    vibe: text('vibe'),
    bpm: integer('bpm'),
    key: text('key'),
    releaseDate: text('release_date'),
    releaseYear: integer('release_year'),
    releaseMonth: text('release_month'),
    coverUrl: text('cover_url'),
    audioUrl: text('audio_url'),
    downloadUrl: text('download_url'),
    duration: text('duration'),
    isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    tags: text('tags'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 17. GENRES (Music Pool taxonomy)
export const genres = sqliteTable('genres', {
    id: text('id').primaryKey(),
    name: text('name').unique().notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 17. NEWSLETTER CAMPAIGNS
export const newsletterCampaigns = sqliteTable('newsletter_campaigns', {
    id: text('id').primaryKey(),
    subject: text('subject').notNull(),
    content: text('content').notNull(),
    targetAudience: text('target_audience'),
    sentCount: integer('sent_count').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 18. TRACK VERSIONS
export const trackVersions = sqliteTable('track_versions', {
    id: text('id').primaryKey(),
    trackId: text('track_id').references(() => tracks.id),
    versionName: text('version_name'), // e.g., 'Clean', 'Dirty', 'Radio Edit'
    previewUrl: text('preview_url'),
    fileUrl: text('file_url'),
    downloadUrl: text('download_url'),
    fileSize: text('file_size'),
    format: text('format').default('mp3'),
    isMainVersion: integer('is_main_version', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 19. EVENT GIGS (Bookings)
export const eventGigs = sqliteTable('event_gigs', {
    id: text('id').primaryKey(),
    eventName: text('event_name').notNull(),
    eventDate: text('event_date').notNull(),
    location: text('location'),
    description: text('description'),
    status: text('status').default('confirmed'), // confirmed, pending, cancelled
    depositReceived: real('deposit_received').default(0),
    paystackRef: text('paystack_ref'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 20. PAYMENTS (Logs)
export const payments = sqliteTable('payments', {
    id: text('id').primaryKey(), // Reference code
    userId: text('user_id').references(() => profiles.id),
    customerEmail: text('customer_email'),
    amountKes: real('amount_kes').notNull(),
    currency: text('currency').default('KES'),
    status: text('status').default('success'),
    method: text('method'), // mpesa, card, etc.
    verifiedSig: integer('verified_sig', { mode: 'boolean' }).default(false),
    metadata: text('metadata'), // JSON string
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
