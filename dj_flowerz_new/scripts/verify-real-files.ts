
import { supabase } from '../utils/supabase';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function run() {
    const { data: tracks } = await supabase.from('pool_tracks')
        .select('download_url')
        .not('download_url', 'is', null)
        .limit(100);

    console.log(`Checking ${tracks?.length || 0} tracks...`);
    let realCount = 0;

    for (const track of tracks || []) {
        try {
            const res = await fetch(track.download_url, { method: 'HEAD' });
            const ct = res.headers.get('content-type');
            if (ct && !ct.includes('text/html')) {
                console.log('REAL FILE FOUND:', track.download_url);
                realCount++;
            }
        } catch (e) {
            // console.log('Error:', track.download_url, e.message);
        }
    }
    console.log(`Total real files in first 100: ${realCount}`);
}

run().catch(console.error);
