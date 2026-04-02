import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envLocalRaw = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const supabaseUrlMatch = envLocalRaw.match(/VITE_SUPABASE_URL=\"([^\"]+)\"/);
const supabaseKeyMatch = envLocalRaw.match(/SUPABASE_SECRET_KEY=\"([^\"]+)\"/);

const SUPABASE_URL = (supabaseUrlMatch ? supabaseUrlMatch[1] : '').replace(/\\n/g, '').replace(/\n/g, '').trim();
const SUPABASE_KEY = (supabaseKeyMatch ? supabaseKeyMatch[1] : '').replace(/\\n/g, '').replace(/\n/g, '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing or invalid Supabase URL/Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSyncSQL() {
    console.log(`fetching users from Supabase: ${SUPABASE_URL}...`);

    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        
        if (error) {
            console.error('Error fetching Supabase auth users:', error);
            process.exit(1);
        }

        console.log(`Found ${users.length} total users in Supabase.`);

        let sqlOut = `-- Sync generated on: ${new Date().toISOString()}\n`;

        for (const user of users) {
             const id = user.id;
             const email = user.email || '';
             const fullName = (user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0])?.replace(/'/g, "''");
             // Default to user role, free tier, no subscription
             const role = 'user';
             const now = new Date().toISOString();

             // UPSERT command matching the schema in r2-storage-worker.js
             sqlOut += `INSERT INTO profiles (id, email, full_name, role, is_subscriber, subscription_plan, created_at, updated_at) VALUES ('${id}', '${email}', '${fullName}', '${role}', 0, 'none', '${now}', '${now}') ON CONFLICT(email) DO UPDATE SET id = excluded.id;\n`;
        }
        
        console.log('\n--- SQL TO EXECUTE ON D1 ---');
        console.log(sqlOut);
        console.log('----------------------------\n');
        
        console.log('Copy the above SQL and run it via wrangler, OR save to a file and run:');
        console.log('npx wrangler d1 execute djflowerz-db --file=sync.sql --remote');

    } catch (e) {
        console.error('Sync failed:', e);
    }
}

generateSyncSQL();
