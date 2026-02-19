
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function analyzeDuplicates() {
    console.log('--- Analyzing Duplicates (Title + Artist) ---');

    // We can't easily group by in Supabase client for 163k rows without a custom RPC.
    // Let's fetch page by page and count locally or use a sampled check.

    // Let's use a smarter approach: find many-to-one title/artist.
    // I'll use a script to fetch chunks and find collisions.

    let totalProcessed = 0;
    const pageSize = 10000;
    const seen = new Map<string, string[]>(); // key -> [ids]

    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('pool_tracks')
            .select('id, title, artist')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error(error);
            break;
        }
        if (!data || data.length === 0) break;

        for (const track of data) {
            const key = `${track.title.trim().toLowerCase()}|${track.artist.trim().toLowerCase()}`;
            if (!seen.has(key)) {
                seen.set(key, []);
            }
            seen.get(key)!.push(track.id);
        }

        totalProcessed += data.length;
        console.log(`Processed ${totalProcessed}...`);
        page++;
    }

    let dupPairs = 0;
    let totalDups = 0;
    const toDelete = [];

    for (const [key, ids] of seen.entries()) {
        if (ids.length > 1) {
            dupPairs++;
            totalDups += (ids.length - 1);
            // Keep the first ID, delete others
            toDelete.push(...ids.slice(1));
        }
    }

    console.log(`Found ${dupPairs} unique title/artist pairs that have duplicates.`);
    console.log(`Total duplicate records to delete: ${totalDups}`);

    if (toDelete.length > 0) {
        console.log('Sample IDs to delete:', toDelete.slice(0, 5));
    }
}

analyzeDuplicates().catch(console.error);
