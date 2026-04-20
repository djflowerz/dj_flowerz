
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

async function syncUsers() {
    console.log('🚀 Starting User Profile Synchronization...');

    // 1. Fetch all Firestore users
    console.log('Fetching Firestore users...');
    const fireSnapshot = await db.collection('users').get();
    const fireUsers = new Map();
    fireSnapshot.forEach(doc => {
        fireUsers.set(doc.data().email, { id: doc.id, ...doc.data() });
    });
    console.log(`Found ${fireUsers.size} users in Firestore.`);

    // 2. Fetch all Supabase Auth users
    console.log('Fetching Supabase Auth users...');
    const { data: { users: sbUsers }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    console.log(`Found ${sbUsers.length} users in Supabase Auth.`);

    // 3. Sync each Supabase user to the profiles table
    for (const sbUser of sbUsers) {
        const email = sbUser.email;
        const fireUser = fireUsers.get(email) || {};

        const adminEmails = (process.env.VITE_ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
        const isAdmin = adminEmails.includes(email || '') || fireUser.role === 'admin';

        console.log(`Syncing profile for ${email}...`);

        const profileData = {
            id: sbUser.id,
            email: email,
            name: sbUser.user_metadata?.full_name || fireUser.name || fireUser.displayName || 'User',
            role: isAdmin ? 'admin' : (fireUser.role || 'user'),
            is_subscriber: fireUser.isSubscriber || false,
            subscription_plan: fireUser.subscriptionPlan || null,
            subscription_expiry: toISO(fireUser.subscriptionExpiry),
            avatar_url: sbUser.user_metadata?.avatar_url || fireUser.avatarUrl || null,
            phone_number: fireUser.phoneNumber || null,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('profiles').upsert(profileData);
        if (error) console.error(`❌ Error syncing ${email}:`, error.message);
        else console.log(`✅ Profile synced for ${email}`);
    }

    // 4. Migrate Payments and Orders (Refresh)
    console.log('\n💳 Refreshing Payments...');
    const paySnapshot = await db.collection('payments').get();
    const payments = paySnapshot.docs.map(doc => ({
        id: doc.id,
        user_id: doc.data().userId || doc.data().user_id,
        user_email: doc.data().userEmail || doc.data().email,
        amount: doc.data().amount,
        currency: doc.data().currency || 'KES',
        status: doc.data().status || 'success',
        payment_ref: doc.data().payment_ref || doc.data().reference,
        payment_type: doc.data().payment_type || 'store',
        metadata: doc.data().metadata || {},
        created_at: toISO(doc.data().createdAt || doc.data().created_at)
    }));
    if (payments.length > 0) await supabase.from('payments').upsert(payments);

    console.log('📦 Refreshing Orders...');
    const orderSnapshot = await db.collection('orders').get();
    const orders = orderSnapshot.docs.map(doc => ({
        id: doc.id,
        customer_name: doc.data().customerName || 'Guest',
        customer_email: doc.data().customerEmail || '',
        payment_status: doc.data().paymentStatus || 'paid',
        status: doc.data().status || 'completed',
        total: doc.data().total || 0,
        items: doc.data().items || [],
        shipping_address: doc.data().shippingAddress || '',
        created_at: toISO(doc.data().createdAt || doc.data().created_at)
    }));
    if (orders.length > 0) await supabase.from('orders').upsert(orders);

    console.log('\n🏁 Sync finished.');
}

syncUsers().catch(console.error);
