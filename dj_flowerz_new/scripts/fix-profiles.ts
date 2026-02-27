
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const toISO = (ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate().toISOString();
    return ts;
};

async function migrateProfiles() {
    console.log('🚀 Migrating Auth Users and Profiles...');

    // 1. Get all Supabase users
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const userMap = new Map<string, string>(); // email -> supabaseId
    existingUsers.forEach(u => userMap.set(u.email!, u.id));

    // 2. Fetch Firebase users and create in Supabase if missing
    let token;
    do {
        const res = await auth.listUsers(1000, token);
        for (const user of res.users) {
            if (!user.email) continue;
            let supabaseId = userMap.get(user.email);

            if (!supabaseId) {
                const { data, error } = await supabase.auth.admin.createUser({
                    email: user.email,
                    email_confirm: true,
                    user_metadata: { name: user.displayName }
                });
                if (data?.user) {
                    supabaseId = data.user.id;
                    userMap.set(user.email, supabaseId);
                    console.log(`✅ Created user ${user.email}`);
                } else if (error) {
                    console.error(`❌ Error creating ${user.email}: ${error.message}`);
                }
            }

            if (supabaseId) {
                // Now migrate profile
                const profileDoc = await db.collection('users').doc(user.uid).get();
                if (profileDoc.exists) {
                    const data = profileDoc.data()!;
                    const { error: pError } = await supabase.from('profiles').upsert({
                        id: supabaseId,
                        email: user.email,
                        name: data.name || user.displayName,
                        role: data.role || 'user',
                        is_subscriber: data.isSubscriber || false,
                        subscription_expiry: toISO(data.subscriptionExpiry),
                        created_at: toISO(data.createdAt),
                        updated_at: toISO(data.updatedAt)
                    });
                    if (pError) console.error(`❌ Error updating profile ${user.email}: ${pError.message}`);
                    else process.stdout.write('.');
                }
            }
        }
        token = res.pageToken;
    } while (token);

    console.log('\n✅ Profiles migration complete.');
}

migrateProfiles().catch(console.error);
