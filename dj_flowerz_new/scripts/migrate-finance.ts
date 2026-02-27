
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
    return ts;
};

async function migrateFinance() {
    console.log('🚀 Starting Finance Data Migration (Payments & Tips)...');

    // 1. Migrate Payments
    try {
        console.log('\n💳 Migrating Payments...');
        const paySnapshot = await db.collection('payments').get();
        const payments = paySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                user_id: data.userId || data.user_id,
                user_email: data.userEmail || data.email,
                amount: data.amount,
                currency: data.currency || 'KES',
                status: data.status || 'success',
                payment_ref: data.payment_ref || data.reference,
                payment_type: data.payment_type || 'store',
                metadata: data.metadata || {},
                created_at: toISO(data.createdAt || data.created_at || new Date())
            };
        });

        if (payments.length > 0) {
            const { error } = await supabase.from('payments').upsert(payments);
            if (error) console.error('❌ Payments migration error:', error.message);
            else console.log(`✅ Migrated ${payments.length} payments.`);
        } else {
            console.log('⚠️ No payments found in Firestore.');
        }
    } catch (e: any) {
        console.error('❌ Error reading payments from Firestore:', e.message);
    }

    // 2. Migrate Tips
    try {
        console.log('\n🧧 Migrating Tips...');
        const tipSnapshot = await db.collection('tips').get();
        const tips = tipSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                user_id: data.userId || data.user_id,
                email: data.email,
                amount: data.amount,
                message: data.message || '',
                status: data.status || 'completed',
                created_at: toISO(data.createdAt || data.created_at || new Date())
            };
        });

        if (tips.length > 0) {
            const { error } = await supabase.from('tips').upsert(tips);
            if (error) console.error('❌ Tips migration error:', error.message);
            else console.log(`✅ Migrated ${tips.length} tips.`);
        } else {
            console.log('⚠️ No tips found in Firestore.');
        }
    } catch (e: any) {
        console.error('❌ Error reading tips from Firestore:', e.message);
    }

    console.log('\n🏁 Finance migration attempt finished.');
}

migrateFinance().catch(console.error);
