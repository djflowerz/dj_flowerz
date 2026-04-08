
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = 'https://yevqnoynsqidtplxggzs.supabase.co';
const supabaseKey = 'sb_secret_1Yfo54i-FpiyKUI3XY4B6w_Di7b8ABM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditUsers() {
    console.log('Fetching Supabase users...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
        console.error('Error listing Supabase users:', error.message);
        return;
    }
    console.log(`Supabase Users: ${users.length}`);

    console.log('Fetching D1 users...');
    try {
        const d1ResultRaw = execSync('npx wrangler d1 execute djflowerz-db --command "SELECT id, email FROM profiles" --remote --json', { encoding: 'utf-8' });
        const d1Data = JSON.parse(d1ResultRaw);
        const d1Users = d1Data[0].results;
        console.log(`D1 Users: ${d1Users.length}`);

        const d1UserIds = new Set(d1Users.map(u => u.id));
        const missing = users.filter(u => !d1UserIds.has(u.id));
        console.log(`Missing Users: ${missing.length}`);

        missing.forEach(u => {
            console.log(`- ${u.email} (ID: ${u.id})`);
        });
    } catch (err: any) {
        console.error('Error fetching D1 data:', err.message);
    }
}

auditUsers();
