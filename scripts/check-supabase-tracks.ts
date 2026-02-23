import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkTracks() {
    console.log('Checking pool_tracks table...');
    const { data, error } = await supabase.from('pool_tracks').select('*').limit(10);
    if (error) {
        console.error('Error fetching tracks:', error.message);
    } else {
        console.log(`Found ${data.length} tracks. First 5:`);
        data.forEach((t, i) => {
            if (i < 5) {
                console.log(`- ${t.artist} - ${t.title}`);
                console.log(`  Genre: ${t.genre}, Sub: ${t.sub_genre}, Categories: ${t.category}`);
                if (t.versions && t.versions[0]) {
                    console.log(`  URL: ${t.versions[0].downloadUrl}`);
                }
            }
        });
    }
}

checkTracks();
