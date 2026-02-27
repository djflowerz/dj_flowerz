
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function count() {
    const { count, error } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true });
    if (error) console.error(error);
    else console.log('Total tracks:', count);

    const { count: remixahCount } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true }).eq('artist', 'REMIXAH');
    console.log('Total REMIXAH artists remaining:', remixahCount);
}
count();
