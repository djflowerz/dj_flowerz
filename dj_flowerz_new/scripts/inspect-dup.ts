
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function inspect() {
    const { data } = await supabase.from('pool_tracks').select('title, artist, download_url, id').limit(50000);
    const counts = new Map();
    for (const t of data) {
        const key = `${t.title}|${t.artist}`;
        if (!counts.has(key)) counts.set(key, []);
        counts.get(key).push(t);
    }
    for (const [key, tracks] of counts.entries()) {
        if (tracks.length > 3) {
            console.log('Duplicate Group:', key);
            console.log(JSON.stringify(tracks, null, 2));
            break;
        }
    }
}
inspect();
