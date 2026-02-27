
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function findDups() {
    console.log('Finding duplicate download_urls...');
    const { data, error } = await supabase.from('pool_tracks').select('download_url');

    if (error) {
        console.error(error);
        return;
    }

    const urlMap = new Map();
    const dups = [];

    for (const track of data) {
        if (urlMap.has(track.download_url)) {
            dups.push(track.download_url);
        }
        urlMap.set(track.download_url, true);
    }

    console.log(`Found ${dups.length} duplicate URLs.`);
    if (dups.length > 0) {
        console.log('Samples:', dups.slice(0, 5));
    }

    console.log('Finding duplicate title/artist pairs (simplified)...');
    const { data: metaData } = await supabase.from('pool_tracks').select('title, artist').limit(10000);
    if (metaData) {
        const metaMap = new Map();
        let metaDupCount = 0;
        for (const track of metaData) {
            const key = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
            if (metaMap.has(key)) {
                metaDupCount++;
            }
            metaMap.set(key, true);
        }
        console.log(`Found ${metaDupCount} potential duplicates by title/artist in a sample of 10,000.`);
    }
}

findDups();
