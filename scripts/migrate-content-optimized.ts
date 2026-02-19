

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';


/**
 * OPTIMIZED MIGRATION SCRIPT: Firebase to Supabase
 *
 * Skips:
 * - 'tracks' (Music Pool) - already done
 * - 'users' (Profiles) - already done by the bootstrap script? No, bootstrap creates table. We need to populate it.
 *   BUT we should be careful. Profiles rely on AUTH.USERS.
 *   If we insert into 'profiles' with IDs that don't exist in 'auth.users', it might fail due to FK constraint.
 *   Correction: We removed the FK constraint in the bootstrap?
 *   Let's check the schema.
 *   "id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE"
 *   Yes, FK constraint exists.
 *   So we CANNOT migrate profiles unless the users exist in Supabase Auth first.
 *   We will skip profiles for now to avoid FK errors.
 */

dotenv.config();

// --- CONFIGURATION ---

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- INITIALIZATION ---

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service Account not found at ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

// Read and parse service account with BOM handling
let fileContent = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
// Strip BOM if present
if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
}

let serviceAccount: any;
try {
    serviceAccount = JSON.parse(fileContent);
} catch (err: any) {
    console.error(`❌ Failed to parse serviceAccountKey.json: ${err.message}`);
    console.error(`First 100 chars: ${fileContent.substring(0, 100)}`);
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// --- HELPERS ---

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

// --- MAIN ---

async function main() {
    console.log('🏁 Starting Content Migration (Skipping Pool Tracks & Users)...');

    // 1. PRODUCTS
    await migrateCollection('products', 'products', (data) => ({
        id: data.id,
        name: data.name,
        slug: data.slug,
        price: data.price,
        type: data.type,
        images: data.images || [],
        variants: data.variants || [],
        inventory: data.inventory || 0,
        is_active: data.isActive,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 2. MIXTAPES
    await migrateCollection('mixtapes', 'mixtapes', (data) => {
        // Skip mixtapes without titles (violates NOT NULL constraint)
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
            tracklist: data.tracklist || [],
            allow_download: data.allowDownload,
            download_url: data.downloadUrl,
            video_download_url: data.videoDownloadUrl,
            tags: data.tags || [],
            created_at: toISO(data.createdAt),
            updated_at: toISO(data.updatedAt)
        };
    });

    // 3. ORDERS - WARNING: user_id FK might fail if user doesn't exist
    // We will try to insert. If it fails due to FK, we might need to set user_id to null or skip.
    // For now, let's try mapping 'userId' -> 'user_id' but catch errors.
    // Ideally, we should migrate users first, but we can't without auth.
    // HACK: If we just want the order data, we might need to temporarily drop the FK constraint or
    // map user_id to null if the user isn't in Supabase.
    // Let's assume for now we just want the data and maybe many orders are "guest" (no user_id).

    await migrateCollection('orders', 'orders', (data) => ({
        id: data.id,
        // user_id: data.userId, // COMMENTED OUT to avoid FK errors for now.
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        items: data.items || [],
        total: data.total,
        status: data.status,
        payment_status: data.paymentStatus || 'unpaid',
        // Removed 'date' field - doesn't exist in schema, using created_at instead
        created_at: toISO(data.date || data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 4. BOOKINGS
    await migrateCollection('bookings', 'bookings', (data) => ({
        id: data.id,
        // user_id: data.userId, // COMMENTED OUT to avoid FK errors
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone,
        service_type: data.serviceType,
        service_name: data.serviceName,
        date: data.date,
        time: data.time,
        status: data.status,
        payment_status: data.paymentStatus,
        amount: data.amount,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 5. GENRES
    await migrateCollection('genres', 'genres', (data) => ({
        id: data.id,
        name: data.name,
        cover_url: data.coverUrl,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 6. VIDEOS
    await migrateCollection('youtubeVideos', 'videos', (data) => ({
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        url: data.url,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 7. SUBSCRIPTION PLANS
    await migrateCollection('subscriptionPlans', 'subscription_plans', (data) => ({
        id: data.id,
        name: data.name,
        price: data.price,
        period: data.period,
        features: data.features || [],
        active: data.active,
        link: data.link,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    // 8. SUBSCRIPTIONS
    await migrateCollection('subscriptions', 'subscriptions', (data) => ({
        id: data.id,
        // user_id: data.userId, // FK ISSUE
        user_name: data.userName,
        plan_id: data.planId,
        amount: data.amount,
        start_date: toISO(data.startDate),
        expiry_date: toISO(data.expiryDate),
        status: data.status,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    }));

    console.log('\n🎉 Migration process finished!');
}

main().catch(console.error);
