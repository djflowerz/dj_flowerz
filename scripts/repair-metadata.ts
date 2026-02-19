
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GENERIC_ARTISTS = [
    'Afro House', 'Club Edits', 'Dancehall Remixes', 'Amapiano',
    'Reggae Fussion', 'HYPE EDITS', 'Remix & Mashups', 'R2 Pool',
    'REMIXAH', 'DANCEHALL REFIX', 'AFROBEATS', 'HIP HOP EX',
    'VICKNICK', 'VIDEO POOL', 'POOL_TRACKS'
];

const separators = [' - ', ' – ', ' — ', ' ___ ', ' _ '];

async function repairMetadata() {
    console.log('🛠️  Starting targeted metadata repair for pool tracks...');

    const genericList = GENERIC_ARTISTS.filter(ga => !ga.includes('%'));

    // Query for tracks where artist is generic OR artist matches genre
    let page = 0;
    const pageSize = 1000;
    let totalFixed = 0;

    while (true) {
        console.log(`Checking page ${page}...`);
        const { data: tracks, error: fetchError } = await supabase
            .from('pool_tracks')
            .select('id, title, artist, genre')
            .or(`artist.in.(${genericList.map(g => `"${g}"`).join(',')}),artist.eq.genre`) // Corrected OR syntax for Supabase
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fetchError) {
            console.error('Error fetching tracks:', fetchError);
            break;
        }

        if (!tracks || tracks.length === 0) break;

        console.log(`Processing ${tracks.length} potentially problematic tracks...`);
        let pageFixed = 0;

        for (const track of tracks) {
            let { title, artist, genre, id } = track;
            let originalArtist = artist;
            let originalTitle = title;
            let needsFix = false;

            const isGeneric = (str: string) => {
                const upper = str.toUpperCase();
                return GENERIC_ARTISTS.some(ga => upper.includes(ga.toUpperCase()));
            };

            // Check if artist is generic or matches genre
            if (isGeneric(artist) || artist === genre) {
                let found = false;
                for (const sep of separators) {
                    if (title.includes(sep)) {
                        const parts = title.split(sep);
                        if (parts.length >= 2) {
                            if (isGeneric(parts[0])) {
                                artist = parts[1].trim();
                                title = parts.slice(2).join(sep).trim() || parts[1].trim();
                            } else {
                                artist = parts[0].trim();
                                title = parts.slice(1).join(sep).trim();
                            }
                            found = true;
                            break;
                        }
                    }
                }

                if (!found && title.includes(') ')) {
                    const parts = title.split(') ');
                    if (parts.length >= 2) {
                        artist = parts[parts.length - 1].trim();
                        title = parts.slice(0, -1).join(') ').trim() + ')';
                        found = true;
                    }
                }

                if (found) {
                    artist = artist.replace(/_/g, ' ').trim();
                    title = title.replace(/_/g, ' ').trim();
                    needsFix = true;
                }
            }

            if (needsFix && (artist !== originalArtist || title !== originalTitle)) {
                artist = artist.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
                title = title.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();

                // Final check to avoid fixing to empty strings
                if (artist && title) {
                    const { error: updateError } = await supabase
                        .from('pool_tracks')
                        .update({ artist, title })
                        .eq('id', id);

                    if (!updateError) pageFixed++;
                }
            }
        }

        totalFixed += pageFixed;
        console.log(`Fixed ${pageFixed} tracks in this page. Total so far: ${totalFixed}`);

        if (tracks.length < pageSize) break;
        page++;
    }

    console.log(`✅ Targeted repair complete. Fixed ${totalFixed} tracks total.`);
}

repairMetadata();
