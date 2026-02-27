
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const BASES = [
    'https://r2.vicknickvideopool.com',
    'https://cdn.vicknickvideopool.com'
];
const EXTENSIONS = ['.mp3', '.mp4', '.m4a'];

const CHUNK_SIZE = 100;

async function checkUrl(url: string | null): Promise<boolean> {
    if (!url || !url.startsWith('http')) return false;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) return false;

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

async function probeForUrl(title: string): Promise<string | null> {
    const rawTitle = title;
    const normalizedTitle = rawTitle.replace(/\s+/g, ' ').trim();

    const titleVariants = Array.from(new Set([rawTitle, normalizedTitle]));

    for (const base of BASES) {
        for (const ext of EXTENSIONS) {
            for (const t of titleVariants) {
                if (!t) continue;
                const encoded = encodeURIComponent(t).replace(/%20/g, '%20');
                const url = `${base}/${encoded}${ext}`;

                if (await checkUrl(url)) {
                    return url;
                }
            }
        }
    }
    return null;
}

async function fixTracks() {
    const { supabase } = await import('../utils/supabase');
    console.log("🚀 Starting comprehensive track URL fix...");

    let offset = 0;
    let totalFixed = 0;
    let totalChecked = 0;

    while (true) {
        console.log(`\n📦 Fetching tracks ${offset} to ${offset + CHUNK_SIZE}...`);
        const { data: tracks, error } = await supabase
            .from('pool_tracks')
            .select('id, title, preview_url, download_url')
            .range(offset, offset + CHUNK_SIZE - 1)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("❌ Error fetching tracks:", error);
            break;
        }

        if (!tracks || tracks.length === 0) {
            console.log("🏁 No more tracks to process.");
            break;
        }

        for (const track of tracks) {
            totalChecked++;
            const hasMissing = !track.preview_url || !track.download_url;
            let isDamaged = false;

            if (!hasMissing) {
                // Check if existing URL is reachable
                const isReachable = await checkUrl(track.preview_url);
                if (!isReachable) {
                    isDamaged = true;
                }
            }

            if (hasMissing || isDamaged) {
                process.stdout.write(`🛠️  Fixing [${isDamaged ? 'DAMAGED' : 'MISSING'}]: ${track.title.substring(0, 50)}... `);

                const foundUrl = await probeForUrl(track.title);

                if (foundUrl) {
                    // Check if this URL is already assigned to ANOTHER track
                    const { data: existingTrack, error: checkError } = await supabase
                        .from('pool_tracks')
                        .select('id, title')
                        .eq('download_url', foundUrl)
                        .neq('id', track.id)
                        .maybeSingle();

                    if (existingTrack) {
                        console.log(`⚠️  URL already used by: "${existingTrack.title}" (${existingTrack.id}). Skipping to avoid duplicate.`);
                        // Optional: Mark current track as duplicate or delete? 
                        // For now, let's just skip updating it.
                        continue;
                    }

                    const { error: updateError } = await supabase
                        .from('pool_tracks')
                        .update({
                            preview_url: foundUrl,
                            download_url: foundUrl
                        })
                        .eq('id', track.id);

                    if (updateError) {
                        console.log(`❌ Update failed: ${updateError.message}`);
                    } else {
                        console.log(`✅ Fixed!`);
                        totalFixed++;
                    }
                } else {
                    console.log(`⚠️  Could not find link on CDN.`);
                }
            }
        }

        offset += CHUNK_SIZE;
        // Safety break if we want to run in smaller bursts, but for "without skipping any" we continue.
    }

    console.log(`\n✨ Done! Checked ${totalChecked} tracks, fixed ${totalFixed}.`);
}

fixTracks().catch(err => {
    console.error("💥 Fatal error:", err);
});
