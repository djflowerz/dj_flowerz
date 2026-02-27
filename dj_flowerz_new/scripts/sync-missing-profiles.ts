import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function syncUsers() {
    console.log('Fetching auth.users...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (authError) {
        console.error('Error fetching auth users:', authError.message);
        return;
    }

    console.log(`Found ${users.length} auth.users`);

    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError.message);
        return;
    }

    const profileIds = new Set(profiles.map(p => p.id));
    console.log(`Found ${profileIds.size} profiles`);

    let missing = [];
    for (const user of users) {
        if (!profileIds.has(user.id)) {
            missing.push(user);
        }
    }

    console.log(`Missing profiles: ${missing.length}`);

    let added = 0;
    for (const u of missing) {
        const full_name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '';
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: u.id,
                email: u.email,
                name: full_name,
                role: 'user', // Default role
                status: 'active',
                created_at: u.created_at
            });

        if (insertError) {
            console.error(`Error inserting profile for ${u.email}:`, insertError.message);
        } else {
            console.log(`Inserted profile for ${u.email}`);
            added++;
        }
    }

    console.log(`Successfully added ${added} missing profiles.`);
}

syncUsers();
