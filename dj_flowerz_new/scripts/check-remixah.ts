
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data: tracks, error } = await supabase
        .from('pool_tracks')
        .select('title, artist, genre')
        .eq('artist', 'REMIXAH')
        .limit(20);

    if (error) console.error(error);
    else console.log('REMIXAH tracks remaining:', JSON.stringify(tracks, null, 2));
}
check();
