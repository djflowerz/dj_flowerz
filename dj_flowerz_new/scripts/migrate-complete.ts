
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import fetch from 'node-fetch';

/**
 * COMPLETE MIGRATION: Firebase → Supabase
 * Migrates: Auth Users, Profiles, All Collections, and Storage Files
 */

dotenv.config();

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service Account not found at ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

let fileContent = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
}

let serviceAccount: any;
try {
    serviceAccount = JSON.parse(fileContent);
} catch (err: any) {
    console.error(`❌ Failed to parse serviceAccountKey.json: ${err.message}`);
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// --- GLOBALS ---
const USER_MAP = new Map<string, string>(); // firebaseUid -> supabaseUuid

const toISO = (ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate().toISOString();
    if (ts instanceof Date) return ts.toISOString();
    if (typeof ts === 'string') return ts;
    return null;
};

const cleanUndefined = (obj: any) => {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
};

async function migrateCollection(
    firestoreCol: string,
    supabaseTable: string,
    transform: (doc: any) => any,
    batchSize = 200
) {
    console.log(`\n🚀 Migrating '${firestoreCol}' -> '${supabaseTable}'...`);

    try {
        const snapshot = await db.collection(firestoreCol).get();
        if (snapshot.empty) {
            console.log(`⚠️  Collection '${firestoreCol}' is empty.`);
            return;
        }

        const total = snapshot.size;
        console.log(`📊 Found ${total} docs.`);

        const records = snapshot.docs.map(doc => {
            try {
                const result = transform({ id: doc.id, ...doc.data() });
                return result ? cleanUndefined(result) : null;
            } catch (err: any) {
                console.warn(`⚠️  Skipping doc ${doc.id}: ${err.message}`);
                return null;
            }
        }).filter(Boolean);

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabase.from(supabaseTable).upsert(batch, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Batch ${i} error:`, error.message);
            } else {
                process.stdout.write('.');
            }
        }
        console.log(` ✅ Done.`);
    } catch (err: any) {
        console.error(`❌ Error on ${firestoreCol}:`, err.message);
    }
}

// --- MIGRATE AUTH USERS ---

async function migrateAuthUsers() {
    console.log('\n👥 Migrating Firebase Auth Users to Supabase Auth...');

    try {
        // 1. Fetch all existing Supabase users to avoid conflicts and build initial map
        const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers() as { data: { users: any[] } };
        existingUsers.forEach(u => {
            // We can't easily know the original Firebase UID here without metadata
            // but we can map by email later if needed.
        });

        let nextPageToken: string | undefined;
        let totalUsers = 0;

        do {
            const listUsersResult = await auth.listUsers(1000, nextPageToken);

            for (const user of listUsersResult.users) {
                try {
                    // Check if email already exists in Supabase
                    const existing = existingUsers.find((u: any) => u.email === user.email);

                    if (existing) {
                        USER_MAP.set(user.uid, existing.id);
                        // console.log(`⏩ User ${user.email} already exists in Supabase.`);
                        continue;
                    }

                    // Create user in Supabase Auth
                    const { data, error } = await supabase.auth.admin.createUser({
                        email: user.email!,
                        email_confirm: user.emailVerified,
                        user_metadata: {
                            name: user.displayName,
                            avatar_url: user.photoURL,
                            provider: user.providerData[0]?.providerId || 'email'
                        }
                        // Supabase will generate a valid UUID
                    });

                    if (error) {
                        console.error(`❌ Failed to create user ${user.email}: ${error.message}`);
                    } else if (data && data.user) {
                        USER_MAP.set(user.uid, data.user.id);
                        totalUsers++;
                        process.stdout.write('.');
                    }
                } catch (err: any) {
                    console.error(`❌ Error creating user ${user.email}: ${err.message}`);
                }
            }

            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        console.log(`\n✅ Migrated ${totalUsers} users to Supabase Auth.`);
    } catch (err: any) {
        console.error(`❌ Error migrating auth users: ${err.message}`);
    }
}

// --- MIGRATE STORAGE FILES ---

async function migrateStorageFiles() {
    console.log('\n📦 Migrating Firebase Storage to Supabase Storage...');

    const bucket = storage.bucket();

    // Map Firebase Storage paths to Supabase buckets
    const pathMappings = [
        { firebasePath: 'images/', supabaseBucket: 'images' },
        { firebasePath: 'products/', supabaseBucket: 'images' },
        { firebasePath: 'mixtapes/', supabaseBucket: 'images' },
        { firebasePath: 'audio/', supabaseBucket: 'audio' },
        { firebasePath: 'downloads/', supabaseBucket: 'downloads' }
    ];

    for (const mapping of pathMappings) {
        try {
            console.log(`\n📁 Migrating ${mapping.firebasePath} -> ${mapping.supabaseBucket}...`);

            const [files] = await bucket.getFiles({ prefix: mapping.firebasePath });

            if (files.length === 0) {
                console.log(`⚠️  No files found in ${mapping.firebasePath}`);
                continue;
            }

            console.log(`📊 Found ${files.length} files.`);

            for (const file of files) {
                try {
                    // Download file from Firebase
                    const [fileBuffer] = await file.download();

                    // Get file metadata
                    const [metadata] = await file.getMetadata();
                    const contentType = metadata.contentType || 'application/octet-stream';

                    // Upload to Supabase
                    const fileName = file.name.replace(mapping.firebasePath, '');

                    const { error } = await supabase.storage
                        .from(mapping.supabaseBucket)
                        .upload(fileName, fileBuffer, {
                            contentType,
                            upsert: true
                        });

                    if (error) {
                        console.error(`❌ Failed to upload ${fileName}: ${error.message}`);
                    } else {
                        process.stdout.write('.');
                    }
                } catch (err: any) {
                    console.error(`❌ Error migrating file ${file.name}: ${err.message}`);
                }
            }

            console.log(` ✅ Done.`);
        } catch (err: any) {
            console.error(`❌ Error migrating ${mapping.firebasePath}: ${err.message}`);
        }
    }
}

// --- MAIN MIGRATION ---

async function main() {
    console.log('🏁 Starting COMPLETE Migration: Firebase → Supabase...\n');
    console.log('This will migrate:');
    console.log('  1. Auth Users');
    console.log('  2. User Profiles');
    console.log('  3. All Collections (Products, Mixtapes, Orders, etc.)');
    console.log('  4. Storage Files (Images, Audio, Downloads)\n');

    // 1. MIGRATE AUTH USERS FIRST
    await migrateAuthUsers();

    // 2. MIGRATE USER PROFILES (now that auth users exist)
    await migrateCollection('users', 'profiles', (data) => {
        const supabaseId = USER_MAP.get(data.id);
        if (!supabaseId) {
            console.warn(`⚠️  No Supabase Auth user for profile ${data.email} (${data.id})`);
            return null; // Don't migrate orphan profiles
        }
        return {
            id: supabaseId,
            email: data.email,
            name: data.name,
            role: data.role || 'user',
            is_subscriber: data.isSubscriber || false,
            subscription_expiry: toISO(data.subscriptionExpiry),
            subscription_plan: data.subscriptionPlan,
            avatar_url: data.avatarUrl,
            referral_code: data.referralCode,
            phone_number: data.phoneNumber,
            created_at: toISO(data.createdAt),
            updated_at: toISO(data.updatedAt)
        };
    });

    // 3. MIGRATE ALL COLLECTIONS

    // PRODUCTS
    await migrateCollection('products', 'products', (data) => ({
        id: data.id,
        name: data.name,
        slug: data.slug,
        price: data.price,
        sale_price: data.salePrice,
        description: data.description,
        type: data.type,
        images: data.images || [],
        category: data.category,
        variants: data.variants || [],
        inventory: data.inventory || 0,
        is_active: data.isActive !== false,
        is_featured: data.isFeatured || false,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // MIXTAPES
    await migrateCollection('mixtapes', 'mixtapes', (data) => {
        if (!data.title) {
            console.warn(`⚠️  Skipping mixtape ${data.id} - missing title`);
            return null;
        }
        return {
            id: data.id,
            title: data.title,
            slug: data.slug,
            genre: data.genre,
            description: data.description,
            release_date: toISO(data.releaseDate),
            status: data.status || 'published',
            cover_url: data.coverUrl,
            audio_url: data.audioUrl,
            duration: data.duration,
            tracklist: data.tracklist || [],
            allow_download: data.allowDownload || false,
            allow_full_stream: data.allowFullStream || false,
            download_url: data.downloadUrl,
            video_download_url: data.videoDownloadUrl,
            tags: data.tags || [],
            is_featured: data.isFeatured || false,
            youtube_url: data.youtubeUrl,
            soundcloud_url: data.soundcloudUrl,
            created_at: toISO(data.createdAt),
            updated_at: toISO(data.updatedAt)
        };
    });

    // ORDERS (with user_id now that users exist)
    await migrateCollection('orders', 'orders', (data) => ({
        id: data.id,
        user_id: USER_MAP.get(data.userId) || data.userId, // Map or fallback (fallback for guest orders)
        customer_name: data.customerName,
        customer_email: data.customerEmail || data.email,
        items: data.items || [],
        total: data.total || data.total_amount,
        status: data.status,
        type: data.type || 'Store',
        payment_status: data.paymentStatus || data.payment_status || 'unpaid',
        reference_code: data.referenceCode || data.reference || data.transaction_id,
        tracking_number: data.trackingNumber,
        delivery_method: data.deliveryMethod,
        shipping_address: data.shippingAddress,
        receipt_url: data.receiptUrl,
        metadata: data.metadata || {},
        created_at: toISO(data.date || data.createdAt || data.created_at),
        updated_at: toISO(data.updatedAt)
    }));

    // SUBSCRIPTIONS (with user_id)
    await migrateCollection('subscriptions', 'subscriptions', (data) => ({
        id: data.id,
        user_id: USER_MAP.get(data.userId) || data.userId,
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

    // SUBSCRIPTION PLANS
    await migrateCollection('subscriptionPlans', 'subscription_plans', (data) => ({
        id: data.id,
        name: data.name,
        price: data.price,
        period: data.period,
        features: data.features || [],
        active: data.active !== false,
        is_best_value: data.isBestValue || false,
        link: data.link,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // GENRES
    await migrateCollection('genres', 'genres', (data) => ({
        id: data.id,
        name: data.name,
        cover_url: data.coverUrl,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // VIDEOS
    await migrateCollection('youtubeVideos', 'videos', (data) => ({
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        url: data.url,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // BOOKINGS
    await migrateCollection('bookings', 'bookings', (data) => ({
        id: data.id,
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
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // STUDIO EQUIPMENT
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

    // NEWSLETTER SUBSCRIBERS
    await migrateCollection('subscribers', 'newsletter_subscribers', (data) => ({
        id: data.id,
        email: data.email,
        date_subscribed: data.dateSubscribed,
        status: data.status || 'active',
        source: data.source,
        tags: data.tags || [],
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // PAYMENTS
    await migrateCollection('payments', 'payments', (data) => ({
        id: data.id,
        user_id: USER_MAP.get(data.userId) || data.userId,
        user_email: data.userEmail || data.email,
        amount: data.amount,
        currency: data.currency || 'KES',
        status: data.status,
        payment_ref: data.payment_ref || data.reference,
        payment_type: data.payment_type || data.type,
        metadata: data.metadata || {},
        created_at: toISO(data.createdAt || data.created_at)
    }));

    // TIPS
    await migrateCollection('tips', 'tips', (data) => ({
        id: data.id,
        user_id: USER_MAP.get(data.userId) || data.userId,
        email: data.email,
        amount: data.amount,
        message: data.message,
        status: data.status || 'completed',
        created_at: toISO(data.createdAt || data.created_at)
    }));

    // POOL TRACKS
    await migrateCollection('poolTracks', 'pool_tracks', (data) => ({
        id: data.id,
        artist: data.artist,
        title: data.title,
        genre: data.genre,
        sub_genre: data.sub_genre,
        category: data.category || [],
        bpm: data.bpm || 0,
        key: data.key,
        year: data.year,
        versions: data.versions || [],
        preview_url: data.previewUrl || data.preview_url,
        download_url: data.downloadUrl || data.download_url,
        date_added: toISO(data.dateAdded || data.date_added),
        created_at: toISO(data.createdAt || data.created_at),
        updated_at: toISO(data.updatedAt)
    }));

    // 4. MIGRATE STORAGE FILES
    await migrateStorageFiles();

    console.log('\n\n🎉 COMPLETE MIGRATION FINISHED!');
    console.log('\nNext steps:');
    console.log('  1. Verify data in Supabase Dashboard');
    console.log('  2. Update app to use Supabase client');
    console.log('  3. Test authentication flow');
    console.log('  4. Verify file uploads/downloads work');
}

main().catch(console.error);
