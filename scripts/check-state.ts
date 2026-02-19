
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
    console.log('--- Database Check ---');
    const { data: counts, error: countError } = await supabase.from('pool_tracks').select('category');
    if (countError) {
        console.error('Error fetching tracks:', countError);
    } else {
        const total = counts.length;
        const withNew = counts.filter(t => (t.category || []).some((c: string) => c.toLowerCase() === 'new')).length;
        console.log('Total tracks:', total);
        console.log('Tracks with \"New\" label:', withNew);
    }

    const { data: recent } = await supabase.from('pool_tracks').select('title, artist, date_added').order('date_added', { ascending: false }).limit(5);
    console.log('5 Most recent tracks:', recent);

    console.log('\n--- API Check (VickNick) ---');
    try {
        const vicknickUrl = 'https://r2.vicknickvideopool.com/api/tracks';
        console.log(`Fetching from: ${vicknickUrl}`);
        const res = await fetch(vicknickUrl);
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body length: ${text.length}`);
        if (text.length > 0) {
            try {
                const json = JSON.parse(text);
                console.log(`Parsed JSON. Track count: ${Array.isArray(json) ? json.length : 'Not an array'}`);
            } catch (e) {
                console.error('Failed to parse JSON:', (e as Error).message);
                console.log('Snippet of body:', text.substring(0, 100));
            }
        } else {
            console.warn('Empty response body');
        }
    } catch (err) {
        console.error('Error fetching VickNick API:', (err as Error).message);
    }
}

checkState();
