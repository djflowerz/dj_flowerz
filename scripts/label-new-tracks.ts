
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function labelRecentTracks() {
    console.log('🏷️ Labeling recent tracks as \"New\"...');

    // Define \"recent\" as added in the last 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const dateStr = twoDaysAgo.toISOString();

    console.log(`Searching for tracks added since ${dateStr}...`);

    const { data: tracks, error } = await supabase
        .from('pool_tracks')
        .select('id, category')
        .gt('date_added', dateStr);

    if (error) {
        console.error('Error fetching tracks:', error);
        return;
    }

    if (!tracks || tracks.length === 0) {
        console.log('No recent tracks found to label.');
        return;
    }

    console.log(`Found ${tracks.length} tracks to update.`);

    let updatedCount = 0;
    for (const track of tracks) {
        const categories = track.category || [];
        if (!categories.some((c: string) => c.toLowerCase() === 'new')) {
            const newCategories = [...categories, 'New'];
            const { error: updateError } = await supabase
                .from('pool_tracks')
                .update({ category: newCategories })
                .eq('id', track.id);

            if (!updateError) updatedCount++;
            else console.error(`Error updating track ${track.id}:`, updateError);
        }
    }

    console.log(`✅ Successfully labeled ${updatedCount} tracks as \"New\".`);
}

labelRecentTracks();
