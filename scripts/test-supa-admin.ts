
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yevqnoynsqidtplxggzs.supabase.co';
const supabaseKey = 'sb_secret_1Yfo54i-FpiyKUI3XY4B6w_Di7b8ABM'; // Trying this as service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthAdmin() {
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) {
            console.error('Error listing users:', error.message);
            return;
        }
        console.log(`Successfully fetched ${users.length} users from Supabase auth.users`);
        console.log('User emails:', users.map(u => u.email));
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

testAuthAdmin();
