
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function resetAndFix() {
    console.log('--- FAST "New" Labels Reset ---');

    const syncTime = new Date('2026-02-19T03:15:00.000Z');

    console.log('Fetching track summaries...');
    const { data: allNew, error } = await supabase
        .from('pool_tracks')
        .select('id, category, date_added')
        .contains('category', ['New']);

    if (error || !allNew) {
        console.error('Error fetching tracks:', error);
        return;
    }

    const toReset = allNew.filter(t => new Date(t.date_added) < syncTime);
    console.log(`Resetting ${toReset.length} labels...`);

    // Use higher concurrency for faster execution
    const CONCURRENCY = 20;

    for (let i = 0; i < toReset.length; i += CONCURRENCY) {
        const chunk = toReset.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(track => {
            const newCategories = track.category.filter((c: string) => c !== 'New');
            return supabase
                .from('pool_tracks')
                .update({ category: newCategories })
                .eq('id', track.id);
        }));
        if (i % 200 === 0) console.log(`Processed ${i + chunk.length}...`);
    }

    console.log('Fixed!');
    const { count } = await supabase.from('pool_tracks').select('*', { count: 'exact', head: true }).contains('category', ['New']);
    console.log(`Final count: ${count}`);
}

resetAndFix().catch(console.error);
