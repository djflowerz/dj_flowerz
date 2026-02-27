
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanup() {
    console.log('--- Database Cleanup ---');

    // 1. Delete tracks with null download_url
    const { count: nullCount, error: err1 } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true }).is('download_url', null);
    console.log(`Found ${nullCount} tracks with null download_url.`);

    if (nullCount && nullCount > 0) {
        console.log('Deleting null download_urls...');
        // Delete in batches since it might be huge
        const { error: err2 } = await supabase.from('pool_tracks').delete().is('download_url', null);
        if (err2) console.error('Error deleting nulls:', err2);
        else console.log('Successfully deleted null download_urls.');
    }

    // 2. Full pool deduplication by title + artist
    console.log('Fetching all track headers for deduplication...');
    let totalProcessed = 0;
    const pageSize = 50000;
    const seen = new Map(); // "title|artist" -> { id, hasUrl }
    const toDelete = [];

    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('pool_tracks')
            .select('id, title, artist, download_url')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        for (const track of data) {
            const key = `${track.title.trim().toLowerCase()}|${track.artist.trim().toLowerCase()}`;
            const existing = seen.get(key);

            if (!existing) {
                seen.set(key, { id: track.id, hasUrl: !!track.download_url });
            } else {
                // If existing has no URL but this one does, swap and delete existing
                if (!existing.hasUrl && track.download_url) {
                    toDelete.push(existing.id);
                    seen.set(key, { id: track.id, hasUrl: true });
                } else {
                    // This is a duplicate, delete it
                    toDelete.push(track.id);
                }
            }
        }

        totalProcessed += data.length;
        console.log(`Analyzed ${totalProcessed} tracks...`);
        page++;
    }

    console.log(`Total duplicates identified: ${toDelete.length}`);

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicates in batches of 500...`);
        for (let i = 0; i < toDelete.length; i += 500) {
            const batch = toDelete.slice(i, i + 500);
            const { error } = await supabase.from('pool_tracks').delete().in('id', batch);
            if (error) {
                console.error(`Error deleting batch ${i / 500}:`, error);
            } else {
                if (i % 5000 === 0) console.log(`Deleted ${i + batch.length}...`);
            }
        }
        console.log('Deduplication complete.');
    }
}

cleanup().catch(console.error);
