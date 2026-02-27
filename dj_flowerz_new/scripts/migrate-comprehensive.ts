
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service Account not found at ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const toISO = (ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate().toISOString();
    if (typeof ts === 'string') return ts;
    return new Date().toISOString();
};

async function migrateCollection(fireName: string, sbName: string, mapFn: (data: any, docId: string) => any) {
    console.log(`\n--- Migrating ${fireName} -> ${sbName} ---`);
    try {
        const snapshot = await db.collection(fireName).get();
        if (snapshot.empty) {
            console.log(`ℹ️ ${fireName} is empty.`);
            return;
        }

        const items = snapshot.docs.map(doc => mapFn(doc.data(), doc.id));

        // Chunk items for batch upsert
        const chunkSize = 50;
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            const { error } = await supabase.from(sbName).upsert(chunk);
            if (error) {
                console.error(`❌ Error in ${sbName} batch ${i / chunkSize}:`, error.message);
                console.log('Sample item:', JSON.stringify(chunk[0], null, 2));
            }
        }
        console.log(`✅ Migrated ${items.length} items to ${sbName}.`);
    } catch (e: any) {
        console.error(`❌ Error migrating ${fireName}:`, e.message);
    }
}

async function runFullMigration() {
    console.log('🚀 Starting Comprehensive Migration...');

    // 1. Mixtapes
    await migrateCollection('mixtapes', 'mixtapes', (d, id) => ({
        id: id,
        title: d.name || d.title || 'Untitled',
        slug: d.slug || (d.name || d.title || '').toLowerCase().replace(/\s+/g, '-'),
        genre: d.genre,
        description: d.description,
        release_date: toISO(d.releaseDate || d.release_date),
        cover_url: d.image || d.cover_url,
        audio_url: d.audio_url || d.audioUrl,
        download_url: d.download_url || d.downloadUrl,
        tracklist: d.tracklist || [],
        duration: d.duration,
        status: d.status || 'published',
        is_featured: d.is_featured || false,
        created_at: toISO(d.createdAt || d.created_at),
        updated_at: toISO(d.updatedAt || d.updated_at)
    }));

    // 2. Products
    await migrateCollection('products', 'products', (d, id) => ({
        id: id,
        name: d.name,
        slug: d.slug || d.name?.toLowerCase().replace(/\s+/g, '-'),
        type: d.type || 'physical',
        price: d.price || 0,
        sale_price: d.salePrice || d.sale_price,
        description: d.description,
        images: d.images || (d.image ? [d.image] : []),
        category: d.category,
        inventory: d.inventory || 0,
        is_featured: d.isFeatured || false,
        created_at: toISO(d.createdAt || d.created_at)
    }));

    // 3. Subscriptions
    await migrateCollection('subscriptions', 'subscriptions', (d, id) => ({
        id: id,
        user_id: d.userId || d.user_id,
        plan_id: d.planId || d.plan_id,
        amount: d.amount || 0,
        start_date: toISO(d.startDate || d.start_date),
        expiry_date: toISO(d.expiryDate || d.expiry_date || d.endDate || d.end_date),
        status: d.status || 'active',
        created_at: toISO(d.createdAt || d.created_at)
    }));

    // 4. Newsletter
    await migrateCollection('newsletter_subscribers', 'newsletter_subscribers', (d, id) => ({
        id: id || d.email,
        email: d.email,
        status: d.status || 'subscribed',
        date_subscribed: toISO(d.dateSubscribed || d.created_at),
        created_at: toISO(d.createdAt || d.created_at)
    }));

    // 5. Bookings
    await migrateCollection('bookings', 'bookings', (d, id) => ({
        id: id,
        client_name: d.clientName || d.name,
        client_email: d.clientEmail || d.email,
        client_phone: d.clientPhone || d.phone,
        service_type: d.serviceType,
        date: d.date,
        time: d.time,
        status: d.status || 'pending',
        amount: d.amount || 0,
        created_at: toISO(d.createdAt || d.created_at)
    }));

    console.log('\n🏁 Full Migration Finished.');
}

runFullMigration().catch(console.error);
