import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function backfillUser() {
    const email = 'bidalielvis@gmail.com';
    const id = 'a0010930-b989-4f5d-916f-cc1bf7f7d3db'; // Found in previous step

    console.log(`Backfilling user ${email} (${id}) into profiles...`);

    const now = new Date().toISOString();
    const newProfile = {
        id: id,
        name: 'Elvis Bidali', // Guessed name based on email
        email: email,
        role: 'user',
        is_subscriber: false,
        avatar_url: `https://ui-avatars.com/api/?name=Elvis+Bidali&background=random`,
        created_at: now,
        updated_at: now,
        last_seen: now,
        presence_status: 'offline'
    };

    const { error } = await supabase.from('profiles').insert(newProfile);

    if (error) {
        console.error('Error backfilling user:', error.message);
    } else {
        console.log('User successfully backfilled into profiles.');
    }
}

backfillUser();
