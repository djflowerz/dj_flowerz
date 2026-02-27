
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyData() {
    console.log('🔍 Verifying Pool Data...');

    // 1. Count Total Tracks
    const { count, error: countError } = await supabase
        .from('pool_tracks')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error counting tracks:', countError);
        return;
    }
    console.log(`✅ Total Tracks in DB: ${count}`);

    // 2. Inspect Sample Tracks
    const { data: samples, error: sampleError } = await supabase
        .from('pool_tracks')
        .select('title, artist, genre, category, year')
        .limit(5);

    if (sampleError) {
        console.error('❌ Error fetching samples:', sampleError);
        return;
    }

    console.log('\n📝 Sample Tracks:');
    samples.forEach((track, i) => {
        console.log(`\n  Track ${i + 1}:`);
        console.log(`    Title: ${track.title}`);
        console.log(`    Artist: ${track.artist}`);
        console.log(`    Genre: ${track.genre}`);
        console.log(`    Category: ${JSON.stringify(track.category)}`);
        console.log(`    Year: ${track.year}`);
    });

    // 3. Check for Anomalies (e.g., missing genre)
    const { count: missingGenreCount, error: missingGenreError } = await supabase
        .from('pool_tracks')
        .select('*', { count: 'exact', head: true })
        .is('genre', null);

    if (missingGenreError) {
        console.error('❌ Error checking for missing genres:', missingGenreError);
    } else {
        console.log(`\n⚠️ Tracks with missing genre: ${missingGenreCount}`);
    }

    // 4. Check for Anomalies (e.g., missing year)
    const { count: missingYearCount, error: missingYearError } = await supabase
        .from('pool_tracks')
        .select('*', { count: 'exact', head: true })
        .is('year', null);

    if (missingYearError) {
        console.error('❌ Error checking for missing years:', missingYearError);
    } else {
        console.log(`⚠️ Tracks with missing year: ${missingYearCount}`);
    }
}

verifyData();
