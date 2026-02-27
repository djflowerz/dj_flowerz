
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function robustDedupe() {
    console.log('--- Robust Deduplication ---');

    const allTracks = [];
    let page = 0;
    const pageSize = 50000;

    console.log('Fetching all track records...');
    while (true) {
        const { data, error } = await supabase
            .from('pool_tracks')
            .select('id, title, artist, download_url')
            .order('id') // Crucial for stable pagination
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching data:', error);
            break;
        }
        if (!data || data.length === 0) break;

        allTracks.push(...data);
        console.log(`Fetched ${allTracks.length} tracks...`);
        if (data.length < pageSize) break;
        page++;
    }

    console.log(`Total records fetched: ${allTracks.length}`);

    const seen = new Map(); // "title|artist" -> { id, hasUrl }
    const toDelete = new Set<string>();

    for (const track of allTracks) {
        const title = (track.title || '').trim().toLowerCase();
        const artist = (track.artist || '').trim().toLowerCase();
        const key = `${title}|${artist}`;

        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, { id: track.id, hasUrl: !!track.download_url });
        } else {
            // Decision: keep the one with download_url
            if (!existing.hasUrl && track.download_url) {
                // The new one is better
                toDelete.add(existing.id);
                seen.set(key, { id: track.id, hasUrl: true });
            } else {
                // The current one is a duplicate (or equally good/worse)
                toDelete.add(track.id);
            }
        }
    }

    const deleteList = Array.from(toDelete);
    console.log(`Identified ${deleteList.length} unique IDs to delete.`);

    if (deleteList.length > 0) {
        console.log(`Deleting in batches of 200...`);
        for (let i = 0; i < deleteList.length; i += 200) {
            const batch = deleteList.slice(i, i + 200);
            const { error } = await supabase.from('pool_tracks').delete().in('id', batch);
            if (error) {
                console.error(`Error deleting batch ${i / 200}:`, error);
            } else {
                if (i % 2000 === 0) console.log(`Deleted ${i + batch.length}...`);
            }
        }
        console.log('Successfully deduplicated the pool!');
    } else {
        console.log('No duplicates found.');
    }
}

robustDedupe().catch(console.error);
