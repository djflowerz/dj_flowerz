
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GENERIC_ARTISTS = [
    'Afro House', 'Club Edits', 'Dancehall Remixes', 'Amapiano',
    'Reggae Fussion', 'HYPE EDITS', 'Remix & Mashups', 'R2 Pool',
    'REMIXAH', 'DANCEHALL REFIX', 'AFROBEATS', 'HIP HOP EX',
    'VICKNICK', 'VIDEO POOL', 'POOL_TRACKS'
];

async function checkGenerics() {
    for (const ga of GENERIC_ARTISTS) {
        const { count, error } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true }).eq('artist', ga);
        console.log(`${ga}: ${count}`);
    }
}
checkGenerics();
