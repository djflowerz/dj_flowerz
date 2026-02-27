
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const BASES = [
    'https://r2.vicknickvideopool.com',
    'https://cdn.vicknickvideopool.com'
];
const EXTENSIONS = ['.mp3', '.mp4', '.m4a'];

// Helper to check URL
async function checkUrl(url: string) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
    } catch {
        return false;
    }
}

async function main() {
    const { supabase } = await import('../utils/supabase');

    console.log("🔍 Fetching tracks with missing preview_url...");
    const { data: tracks, error } = await supabase
        .from('pool_tracks')
        .select('*')
        .is('preview_url', null)
        .order('created_at', { ascending: false }) // process newest first?
        .limit(200); // larger batch

    if (error) {
        console.error("Error fetching tracks:", error);
        return;
    }

    if (!tracks || tracks.length === 0) {
        console.log("✅ No tracks found with missing preview_url.");
        return;
    }

    console.log(`Creating fix for ${tracks.length} tracks...`);

    let fixedCount = 0;

    for (const track of tracks) {
        process.stdout.write(`Processing: ${track.title.substring(0, 40)}... `);

        let foundUrl: string | null = null;

        // Note: encodeURIComponent encodes space as %20.

        // Variations to try
        // 1. Strict encodeURIComponent (matches our successful probe)
        const rawTitle = track.title;
        const normalizedTitle = rawTitle.replace(/\s+/g, ' '); // Normalize spaces

        // Try both raw and normalized variations
        const titleVariants = [
            rawTitle,
            normalizedTitle
        ];

        // Probe loop
        probeLoop:
        for (const base of BASES) {
            for (const ext of EXTENSIONS) {
                for (const t of titleVariants) {
                    if (!t) continue;
                    const encoded = encodeURIComponent(t).replace(/%20/g, '%20');
                    const url = `${base}/${encoded}${ext}`;

                    if (await checkUrl(url)) {
                        foundUrl = url;
                        break probeLoop;
                    }
                }
            }
        }

        if (foundUrl) {
            console.log(`✅ FOUND: ${foundUrl}`);
            const { error: updateError } = await supabase
                .from('pool_tracks')
                .update({
                    preview_url: foundUrl,
                    download_url: foundUrl, // Update both
                })
                .eq('id', track.id);

            if (updateError) {
                console.log(`   ❌ Update failed: ${updateError.message}`);
            } else {
                fixedCount++;
            }
        } else {
            console.log("❌ Not found on CDN");
        }
    }

    console.log(`\n🎉 Finished! Fixed ${fixedCount} / ${tracks.length} tracks.`);
}

main();
