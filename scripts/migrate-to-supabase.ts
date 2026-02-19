
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase URL or Service Role Key missing in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const INPUT_FILE = 'r2_downloads_list.txt';

async function migrate() {
    console.log('🚀 Starting Migration to Supabase...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file ${INPUT_FILE} not found`);
        return;
    }

    const content = fs.readFileSync(INPUT_FILE, 'utf-8');
    const lines = content.split('\n');

    let currentCategory = "Uncategorized";
    const tracks: any[] = [];

    console.log('📝 Parsing text file...');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("CATEGORY:")) {
            const match = line.match(/CATEGORY: (.*?) \( /);
            currentCategory = match ? match[1].trim() : line.replace("CATEGORY:", "").trim();
            continue;
        }

        if (line.startsWith("Title:")) {
            const artist = line.replace("Title:", "").trim();
            const title = lines[i + 1]?.replace("Artist:", "").trim() || "";
            const previewUrl = lines[i + 2]?.replace("Preview Link:", "").trim() || "";
            const downloadUrl = lines[i + 3]?.replace("Download Link:", "").trim() || "";

            if (!downloadUrl) continue;

            // Extract Year
            let year = 2024;
            const yearMatch = (currentCategory + " " + title + " " + artist).match(/(20\d{2})/);
            if (yearMatch) year = parseInt(yearMatch[1]);

            tracks.push({
                title,
                artist,
                genre: currentCategory,
                category: [currentCategory],
                year,
                bpm: 0,
                preview_url: previewUrl,
                download_url: downloadUrl,
                versions: [{ id: 'v1', type: 'Original', download_url: downloadUrl }],
                date_added: new Date().toISOString()
            });

            i += 3; // Skip next lines as they are processed
        }
    }

    console.log(`✅ Parsed ${tracks.length} tracks.`);

    // Deduplicate tracks by download_url to avoid batch conflict errors
    console.log('🧹 Deduplicating tracks...');
    const uniqueTracksMap = new Map();
    for (const track of tracks) {
        if (!uniqueTracksMap.has(track.download_url)) {
            uniqueTracksMap.set(track.download_url, track);
        }
    }
    const uniqueTracks = Array.from(uniqueTracksMap.values());
    console.log(`✨ Deduplicated: ${uniqueTracks.length} unique tracks remaining.`);

    // Batch Insert
    const BATCH_SIZE = 500;
    console.log(`📦 Inserting in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < uniqueTracks.length; i += BATCH_SIZE) {
        const batch = uniqueTracks.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('pool_tracks').upsert(batch, { onConflict: 'download_url' });

        if (error) {
            console.error(`❌ Error in batch ${i / BATCH_SIZE}:`, error.message);
        } else {
            console.log(`⏳ Inserted tracks ${i} to ${Math.min(i + BATCH_SIZE, tracks.length)}`);
        }
    }

    console.log('✨ Migration Complete!');
}

migrate().catch(console.error);
