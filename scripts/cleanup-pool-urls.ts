
import { supabase } from '../utils/supabase';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function run() {
    console.log('🧹 Starting cleanup of false-positive track URLs...');
    let offset = 0;
    const CHUNK = 100;
    let clearedCount = 0;
    let totalChecked = 0;

    while (true) {
        console.log(`Checking batch at offset ${offset}...`);
        const { data: tracks, error } = await supabase
            .from('pool_tracks')
            .select('id, download_url')
            .not('download_url', 'is', null)
            .range(offset, offset + CHUNK - 1);

        if (error) {
            console.error('Supabase error:', error);
            break;
        }
        if (!tracks || tracks.length === 0) {
            console.log('No more tracks with URLs to check.');
            break;
        }

        for (const track of tracks) {
            totalChecked++;
            try {
                const res = await fetch(track.download_url, { method: 'HEAD' });
                const ct = res.headers.get('content-type');
                if (ct && ct.includes('text/html')) {
                    // console.log(`Clearing false positive: ${track.download_url}`);
                    await supabase.from('pool_tracks').update({ download_url: null, preview_url: null }).eq('id', track.id);
                    clearedCount++;
                }
            } catch (e) {
                // ignore network errors or timeouts for now
            }
        }
        offset += CHUNK;
        // Safety break for testing if needed
        // if (offset > 1000) break; 
    }
    console.log(`✨ Cleanup done. Total checked: ${totalChecked}, Cleared: ${clearedCount}`);
}

run().catch(console.error);
