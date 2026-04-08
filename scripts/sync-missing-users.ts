
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = 'https://yevqnoynsqidtplxggzs.supabase.co';
const supabaseKey = 'sb_secret_1Yfo54i-FpiyKUI3XY4B6w_Di7b8ABM';

const supabase = createClient(supabaseUrl, supabaseKey);

const MISSING_USERS = [
    { email: 'djfrankee@hotmail.com', id: 'dee66d2b-a251-4478-81ba-55645115a1f8' },
    { email: 'jmunuve005@gmail.com', id: 'f5485d86-a03a-41a4-8196-32883cc1549f' },
    { email: 'gstuff110@gmail.com', id: '59c0802c-09f2-414e-bd98-70a75ed5c75e' }
];

async function syncUsers() {
    console.log(`Starting sync for ${MISSING_USERS.length} users...`);
    
    for (const user of MISSING_USERS) {
        console.log(`Syncing ${user.email}...`);
        try {
            // Check if user exists in biographies (metadata) if any, but profiles is the main table
            // We just need to insert into profiles.
            const query = `INSERT INTO profiles (id, email, full_name, role, status, is_subscriber, created_at, updated_at) VALUES ('${user.id}', '${user.email}', '', 'user', 'active', 0, datetime('now'), datetime('now')) ON CONFLICT(id) DO NOTHING;`;
            
            execSync(`npx wrangler d1 execute djflowerz-db --command "${query}" --remote`, { stdio: 'inherit' });
            console.log(`✓ Successfully synced ${user.email}`);
        } catch (err: any) {
            console.error(`✗ Failed to sync ${user.email}:`, err.message);
        }
    }
    
    console.log('Sync complete.');
}

syncUsers();
