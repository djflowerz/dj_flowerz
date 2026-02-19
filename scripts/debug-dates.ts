
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data } = await supabase.from('pool_tracks').select('date_added, created_at, id').contains('category', ['New']).limit(10);
    console.log('Sample data:', JSON.stringify(data, null, 2));
}
check();
