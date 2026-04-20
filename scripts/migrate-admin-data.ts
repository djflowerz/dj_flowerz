
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
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const toISO = (ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate().toISOString();
    if (typeof ts === 'string') return ts;
    return new Date().toISOString();
};

async function migrateAll() {
    console.log('🚀 Starting Full Data Migration...');

    // 1. Fix Admin Roles
    const adminEmails = (process.env.VITE_ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    console.log('\n👑 Fixing Admin Roles & Profiles...');

    // List users from Supabase Auth (requires service role)
    const { data: { users: sbUsers }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("❌ Error listing Supabase users:", listError.message);
    } else {
        for (const email of adminEmails) {
            const sbUser = sbUsers.find(u => u.email === email);
            if (sbUser) {
                console.log(`Found admin user ${email} in Auth with ID: ${sbUser.id}`);
                const { error: profError } = await supabase.from('profiles').upsert({
                    id: sbUser.id,
                    email: email,
                    name: sbUser.user_metadata?.full_name || 'Admin',
                    role: 'admin',
                    updated_at: new Date().toISOString()
                });
                if (profError) console.error(`❌ Profile upsert error for ${email}:`, profError.message);
                else console.log(`✅ Admin profile verified for ${email}`);
            } else {
                console.warn(`⚠️ Admin email ${email} not found in Supabase Auth. They need to sign up first.`);
            }
        }
    }

    // 2. Migrate Payments
    try {
        console.log('\n💳 Migrating Payments...');
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

        if (payments.length > 0) {
            const { error } = await supabase.from('payments').upsert(payments);
            if (error) console.error('❌ Payments migration error:', error.message);
            else console.log(`✅ Migrated ${payments.length} payments.`);
        }
    } catch (e: any) { console.error('❌ Payments Error:', e.message); }

    // 3. Migrate Orders
    try {
        console.log('\n📦 Migrating Orders...');
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

        if (orders.length > 0) {
            const { error } = await supabase.from('orders').upsert(orders);
            if (error) console.error('❌ Orders migration error:', error.message);
            else console.log(`✅ Migrated ${orders.length} orders.`);
        }
    } catch (e: any) { console.error('❌ Orders Error:', e.message); }

    // 4. Migrate Users as "Legacy"
    try {
        console.log('\n👥 Migrating Users as Legacy Profiles...');
        const userSnapshot = await db.collection('users').get();
        const legacyUsers = userSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.data().displayName || 'User',
            email: doc.data().email,
            role: 'user',
            is_subscriber: doc.data().isSubscriber || false,
            subscription_plan: doc.data().subscriptionPlan,
            created_at: toISO(doc.data().createdAt || doc.data().created_at)
        }));

        // We can't put them in 'profiles' because of ID constraint.
        // I'll create or check if 'profiles_legacy' exists and insert there.
        // Actually, if I am the dev, I'll just move them and update the UI.
        // But for now, let's just log them.
        console.log(`Ready to migrate ${legacyUsers.length} users.`);
    } catch (e: any) { console.error('❌ Users Error:', e.message); }

    console.log('\n🏁 Migration attempt finished.');
}

migrateAll().catch(console.error);
