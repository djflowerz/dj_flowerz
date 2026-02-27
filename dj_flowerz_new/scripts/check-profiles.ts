import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkUsers() {
    console.log('Checking profiles table...');
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) {
        console.error('Error fetching users:', error.message);
    } else {
        console.log(`Found ${data.length} users:`);
        data.forEach(u => {
            console.log(`- ${u.email} (${u.name}), ID: ${u.id}, Created: ${u.created_at}`);
        });
    }
}

checkUsers();
