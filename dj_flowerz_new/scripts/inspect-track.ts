
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Dynamic import for supabase client
async function main() {
    const { supabase } = await import('../utils/supabase');

    const trackName = "Indo Ciene Salim Young [ Extended ] [ DJ FLOWERZ VIDEOPOOL ]-1";
    // Or partial match "Indo Ciene Salim Young"

    console.log(`Searching for track: ${trackName}`);

    const { data, error } = await supabase
        .from('pool_tracks')
        .select('*')
        .ilike('title', `%Indo Ciene%`)
        .limit(5);

    if (error) {
        console.error("Error fetching track:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No track found.");
        return;
    }

    console.log("Found tracks:", data.length);
    data.forEach(track => {
        console.log(`\nKeys: ${Object.keys(track).join(', ')}`);
        console.log(`ID: ${track.id}`);
        console.log(`Title: ${track.title}`);
        console.log(`Preview URL: ${track.preview_url}`);
        console.log(`Download URL: ${track.download_url}`);
        console.log(`R2 Path: ${track.r2_path || 'N/A'}`);
    });
}

main();
