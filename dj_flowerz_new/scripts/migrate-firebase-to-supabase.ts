
import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * MIGRATION SCRIPT: Firebase to Supabase
 * 
 * Prerequisites:
 * 1. 'serviceAccountKey.json' from Firebase Console placed in project root.
 * 2. .env file with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * 3. 'npm install firebase-admin @supabase/supabase-js dotenv'
 * 
 * Usage:
 * npx tsx scripts/migrate-firebase-to-supabase.ts
 */

dotenv.config();

// --- CONFIGURATION ---

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- INITIALIZATION ---

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('✅ Using Firebase credentials from environment variable.');
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e: any) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var. Trying file fallback...');
    }
}

if (!serviceAccount && fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.log('✅ Using Firebase credentials from file.');
    serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
}

if (!serviceAccount) {
    console.error(`❌ Missing Firebase credentials.`);
    console.error(`   Please set FIREBASE_SERVICE_ACCOUNT env var or download 'serviceAccountKey.json' to: ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// --- HELPERS ---

const toISO = (ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate().toISOString(); // Firestore Timestamp
    if (ts instanceof Date) return ts.toISOString(); // JS Date
    if (typeof ts === 'string') return ts; // Already string
    return null; // Invalid
};

const cleanUndefined = (obj: any) => {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
};

async function migrateCollection(
    firestoreCol: string,
    supabaseTable: string,
    transform: (doc: any) => any,
    batchSize = 500
) {
    console.log(`\n🚀 Migrating Firestore '${firestoreCol}' -> Supabase '${supabaseTable}'...`);

    try {
        const snapshot = await db.collection(firestoreCol).get();
        if (snapshot.empty) {
            console.log(`⚠️  Collection '${firestoreCol}' is empty. Skipping.`);
            return;
        }

        const total = snapshot.size;
        console.log(`📊 Found ${total} documents. Preparing to batch insert...`);

        const records = snapshot.docs.map(doc => {
            try {
                return cleanUndefined(transform({ id: doc.id, ...doc.data() }));
            } catch (err: any) {
                console.warn(`⚠️  Skipping doc ${doc.id} due to error: ${err.message}`);
                return null;
            }
        }).filter(Boolean);

        // Batch Insert
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabase.from(supabaseTable).upsert(batch, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Batch ${i}-${i + batch.length} failed:`, error.message);
            } else {
                console.log(`✅ Inserted ${Math.min(i + batch.length, total)}/${total}`);
            }
        }
    } catch (err: any) {
        console.error(`❌ Error migrating collection '${firestoreCol}':`, err.message);
    }
}

// --- MAIN MIGRATION LOGIC ---

async function main() {
    console.log('🏁 Starting Full Migration...');

    // 1. Users -> profiles
    await migrateCollection('users', 'profiles', (data) => ({
        id: data.id, // Auth UID
        email: data.email,
        name: data.name,
        role: data.role || 'user',
        is_subscriber: data.isSubscriber || false,
        subscription_expiry: toISO(data.subscriptionExpiry),
        subscription_plan: data.subscriptionPlan,
        avatar_url: data.avatarUrl,
        referral_code: data.referralCode,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 2. Mixtapes -> mixtapes
    await migrateCollection('mixtapes', 'mixtapes', (data) => ({
        id: data.id,
        title: data.title,
        slug: data.slug,
        genre: data.genre,
        description: data.description,
        release_date: toISO(data.releaseDate),
        status: data.status || 'published',
        cover_url: data.coverUrl,
        audio_url: data.audioUrl,
        tracklist: data.tracklist || [], // JSONB
        allow_download: data.allowDownload,
        download_url: data.downloadUrl,
        video_download_url: data.videoDownloadUrl,
        tags: data.tags || [],
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 3. Orders -> orders
    await migrateCollection('orders', 'orders', (data) => ({
        id: data.id,
        user_id: data.userId, // References auth.users(id) - verify user exists first!
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        items: data.items || [], // JSONB
        total: data.total,
        status: data.status,
        payment_status: data.paymentStatus || 'unpaid',
        date: toISO(data.date),
        reference_code: data.referenceCode,
        receipt_url: data.receiptUrl,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 4. Products -> products
    await migrateCollection('products', 'products', (data) => ({
        id: data.id,
        name: data.name,
        slug: data.slug,
        price: data.price,
        type: data.type,
        images: data.images || [],
        variants: data.variants || [], // JSONB
        inventory: data.inventory || 0,
        is_active: data.isActive,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 5. Tracks (Music Pool) -> pool_tracks
    await migrateCollection('tracks', 'pool_tracks', (data) => ({
        artist: data.artist,
        title: data.title,
        genre: data.genre,
        category: data.category || [],
        bpm: data.bpm,
        year: data.year,
        versions: data.versions || [],
        preview_url: data.previewUrl,
        download_url: data.downloadUrl,
        date_added: toISO(data.dateAdded),
        created_at: toISO(data.createdAt)
    }), 1000);

    // 6. Genres -> genres
    await migrateCollection('genres', 'genres', (data) => ({
        id: data.id,
        name: data.name,
        cover_url: data.coverUrl,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 7. Bookings -> bookings
    await migrateCollection('bookings', 'bookings', (data) => ({
        id: data.id,
        user_id: data.userId,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone,
        service_type: data.serviceType,
        service_name: data.serviceName,
        date: data.date,
        time: data.time,
        duration: data.duration,
        status: data.status,
        payment_status: data.paymentStatus,
        amount: data.amount,
        budget: data.budget,
        notes: data.notes,
        source: data.source,
        location: data.location,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 8. Studio Equipment -> studio_equipment
    await migrateCollection('studioEquipment', 'studio_equipment', (data) => ({
        id: data.id,
        name: data.name,
        category: data.category,
        image: data.image,
        description: data.description,
        status: data.status,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 9. Coupons -> coupons
    await migrateCollection('coupons', 'coupons', (data) => ({
        id: data.id,
        code: data.code,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        applies_to: data.appliesTo,
        applicable_plans: data.applicablePlans || [],
        expiry_date: toISO(data.expiryDate),
        usage_limit: data.usageLimit,
        usage_count: data.usageCount || 0,
        active: data.active,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 10. Subscriptions -> subscriptions
    await migrateCollection('subscriptions', 'subscriptions', (data) => ({
        id: data.id,
        user_id: data.userId,
        user_name: data.userName,
        plan_id: data.planId,
        amount: data.amount,
        start_date: toISO(data.startDate),
        expiry_date: toISO(data.expiryDate),
        status: data.status,
        payment_method: data.paymentMethod,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 11. Subscription Plans -> subscription_plans
    await migrateCollection('subscriptionPlans', 'subscription_plans', (data) => ({
        id: data.id,
        name: data.name,
        price: data.price,
        period: data.period,
        features: data.features || [],
        active: data.active,
        is_best_value: data.isBestValue || false,
        link: data.link,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 12. Studio Rooms -> studio_rooms
    await migrateCollection('studioRooms', 'studio_rooms', (data) => ({
        id: data.id,
        name: data.name,
        capacity: data.capacity,
        description: data.description,
        status: data.status,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 13. Session Types -> session_types
    await migrateCollection('sessionTypes', 'session_types', (data) => ({
        id: data.id,
        name: data.name,
        description: data.description,
        duration: data.duration,
        price: data.price,
        deposit_required: data.depositRequired,
        equipment_included: data.equipmentIncluded || [],
        active: data.active,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 14. Newsletter Subscribers -> newsletter_subscribers
    await migrateCollection('subscribers', 'newsletter_subscribers', (data) => ({
        id: data.id,
        email: data.email,
        date_subscribed: data.dateSubscribed,
        status: data.status || 'active',
        source: data.source,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 15. Maintenance Logs -> maintenance_logs
    await migrateCollection('maintenanceLogs', 'maintenance_logs', (data) => ({
        id: data.id,
        item_id: data.itemId,
        item_name: data.itemName,
        item_type: data.type,
        description: data.description,
        date: data.date,
        status: data.status,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 16. Newsletter Campaigns -> newsletter_campaigns
    await migrateCollection('newsletterCampaigns', 'newsletter_campaigns', (data) => ({
        id: data.id,
        name: data.name,
        subject: data.subject,
        type: data.type,
        status: data.status,
        sent_date: toISO(data.sentDate),
        recipient_count: data.recipientCount || 0,
        open_rate: data.openRate || 0,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 17. Shipping Zones -> shipping_zones
    await migrateCollection('shippingZones', 'shipping_zones', (data) => ({
        id: data.id,
        name: data.name,
        description: data.description,
        rates: data.rates || [],
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 18. Telegram Channels -> telegram_channels
    await migrateCollection('telegramChannels', 'telegram_channels', (data) => ({
        id: data.id,
        name: data.name,
        channel_id: data.channelId,
        genre: data.genre,
        invite_link: data.inviteLink,
        active: data.active,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 19. Videos -> videos
    await migrateCollection('youtubeVideos', 'videos', (data) => ({
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        url: data.url,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    console.log('\n🎉 Migration process finished!');
}

main().catch(console.error);
