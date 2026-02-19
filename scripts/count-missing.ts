
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function run() {
    const { supabase } = await import('../utils/supabase');
    const { count, error } = await supabase
        .from('pool_tracks')
        .select('*', { count: 'exact', head: true })
        .is('preview_url', null);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Tracks missing URL: ${count}`);
    }
}
run();
