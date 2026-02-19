
import { supabase } from '../utils/supabase';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function run() {
    console.log('Searching for at least one real audio/video file in the database...');
    const { data: tracks, error } = await supabase.from('pool_tracks')
        .select('title, download_url')
        .not('download_url', 'is', null)
        .limit(1000);

    if (error) {
        console.error(error);
        return;
    }

    for (const track of tracks || []) {
        try {
            const res = await fetch(track.download_url, { method: 'HEAD' });
            const ct = res.headers.get('content-type');
            if (res.ok && ct && !ct.includes('html')) {
                console.log('✅ FOUND REAL FILE:', track.title);
                console.log('   URL:', track.download_url);
                console.log('   Type:', ct);
                break;
            }
        } catch (e) { }
    }
}

run().catch(console.error);
