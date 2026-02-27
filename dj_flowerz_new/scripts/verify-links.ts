
import { createClient } from '@supabase/supabase-js';

// Load env vars
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Ensure .env is loaded.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLinks() {
    console.log('🔍 Starting link verification for recently added tracks...');

    // Fetch the last 50 tracks added
    const { data: tracks, error } = await supabase
        .from('pool_tracks')
        .select('id, title, artist, download_url')
        .order('date_added', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching tracks:', error);
        return;
    }

    if (!tracks || tracks.length === 0) {
        console.log('No tracks found to verify.');
        return;
    }

    console.log(`Checking ${tracks.length} most recent tracks...`);

    let successCount = 0;
    let failCount = 0;

    for (const track of tracks) {
        if (!track.download_url) {
            console.warn(`⚠️  [MISSING URL] ${track.artist} - ${track.title}`);
            failCount++;
            continue;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(track.download_url, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                console.log(`✅ [OK] ${track.artist} - ${track.title}`);
                successCount++;
            } else {
                console.error(`❌ [${response.status}] ${track.artist} - ${track.title} (${track.download_url})`);
                failCount++;
            }
        } catch (err) {
            console.error(`❌ [ERROR] ${track.artist} - ${track.title}: ${(err as Error).message}`);
            failCount++;
        }
    }

    console.log('\nVerification Summary:');
    console.log(`✅ Functional: ${successCount}`);
    console.log(`❌ Broken/Missing: ${failCount}`);
}

verifyLinks();
