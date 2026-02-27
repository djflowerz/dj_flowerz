
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { count } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true }).is('download_url', null);
    console.log('Remaining Nulls:', count);
}
check();
