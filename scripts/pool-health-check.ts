
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function finalHealthCheck() {
    console.log('--- Music Pool Health Check ---');

    const { count: total } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true });
    console.log(`Total Tracks: ${total}`);

    const { count: newCount } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true }).contains('category', ['New']);
    console.log(`Tracks labeled 'New': ${newCount}`);

    const { data: genres } = await supabase.from('genres').select('name');
    console.log(`Total Genres: ${genres?.length || 0}`);

    // Check for duplicates by URL (Top 1000 sample)
    const { data: urlSample } = await supabase.from('pool_tracks').select('download_url').limit(10000);
    const urlSet = new Set();
    let dupCount = 0;
    if (urlSample) {
        urlSample.forEach(t => {
            if (urlSet.has(t.download_url)) dupCount++;
            urlSet.add(t.download_url);
        });
    }
    console.log(`Duplicate URLs in 10k sample: ${dupCount}`);

    console.log('-------------------------------');
}

finalHealthCheck().catch(console.error);
