
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = 'https://yevqnoynsqidtplxggzs.supabase.co';
const supabaseKey = 'sb_secret_1Yfo54i-FpiyKUI3XY4B6w_Di7b8ABM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditUsers() {
    // 1. Fetch Supabase users
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
        console.error('Error listing Supabase users:', error.message);
        return;
    }
    console.log(`Supabase Users: ${users.length}`);

    // 2. Fetch D1 users
    console.log('Fetching D1 users...');
    const d1Result = execSync('npx wrangler d1 execute djflowerz-db --command "SELECT id, email FROM profiles" --remote --json', { encoding: 'utf-8' });
    const d1Data = JSON.parse(d1Result);
    const d1Users = d1Data[0].results;
    console.log(`D1 Users: ${d1Users.length}`);

    const d1UserIds = new Set(d1Users.map(u => u.id));
    const d1Emails = new Set(d1Users.map(u => u.email.toLowerCase()));

    // 3. Find missing ones
    const missing = users.filter(u => !d1UserIds.has(u.id));
    console.log(`Missing Users by ID: ${missing.length}`);
    
    if (missing.length > 0) {
        console.log('Missing User Details:');
        missing.forEach(u => {
            console.log(`- Email: ${u.email}, ID: ${u.id}, Created At: ${u.created_at}`);
        });

        // 4. Sycn missing users to D1
        for (const u of missing) {
            const email = u.email;
            const id = u.id;
            const name = u.user_metadata?.full_name || u.user_metadata?.name || email?.split('@')[0] || '';
            const created_at = u.created_at;

            const insertCmd = `INSERT INTO profiles (id, email, name, role, status, created_at) VALUES ('${id}', '${email}', '${name}', 'user', 'active', '${created_at}') ON CONFLICT(id) DO NOTHING;`;
            console.log(`Inserting: ${email}`);
            execSync(`npx wrangler d1 execute djflowerz-db --command "${insertCmd}" --remote`);
        }
        console.log('Sync complete.');
    } else {
        console.log('No missing users found by ID.');
        
        // Double check by Email just in case
        const missingByEmail = users.filter(u => u.email && !d1Emails.has(u.email.toLowerCase()));
        console.log(`Missing Users by Email: ${missingByEmail.length}`);
    }
}

auditUsers();
