import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function findUser() {
    const email = 'ianmuriithiflowerz@gmail.com';
    console.log(`Searching for ${email} in profiles table...`);
    const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();

    if (pError) {
        console.error('Error searching profiles:', pError.message);
    } else if (profile) {
        console.log('User found in profiles table:', profile);
    } else {
        console.log('User NOT found in profiles table.');
    }

    console.log(`Searching for ${email} in auth.users (via admin API)...`);
    const { data: { users }, error: aError } = await supabase.auth.admin.listUsers();

    if (aError) {
        console.error('Error listing auth users:', aError.message);
    } else {
        const authUser = users.find(u => u.email === email);
        if (authUser) {
            console.log('User found in auth.users:', authUser.id, authUser.email);
        } else {
            console.log('User NOT found in auth.users.');
        }
    }
}

findUser();
