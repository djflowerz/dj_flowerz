import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkUsers() {
    console.log('Checking counts...');
    
    // Count profiles
    const { count: profilesCount, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
    if (profilesError) {
        console.error('Error fetching profiles:', profilesError.message);
    } else {
        console.log(`Total public.profiles: ${profilesCount}`);
    }

    // Try counting auth.users if service role key allows it
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    
    if (authError) {
        console.error('Error fetching auth users:', authError.message);
    } else {
        console.log(`Total auth.users: ${users.length}`);
    }
}

checkUsers();
