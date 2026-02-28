
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SOURCES = [
    {
        name: 'Remix & Mashups Hub',
        url: 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks',
        type: 'json'
    },
    {
        name: 'Video Pool',
        url: 'https://r2.vicknickvideopool.com/', // We will try to find a JSON endpoint or scrape
        type: 'html'
    }
];

const SCAN_START_DATE = new Date('2026-02-20T00:00:00Z').getTime();

async function scanTracks() {
    console.log('🚀 Starting daily track scan...');
    const allScanned: any[] = [];

    // 1. Scan Remix & Mashups Hub
    try {
        const res = await fetch(SOURCES[0].url);
        const tracks: any = await res.json();
        console.log(`📡 Fetched ${tracks.length} tracks from Remix Hub`);

        tracks.forEach((t: any) => {
            const uploadTime = new Date(t.uploaded).getTime();
            if (uploadTime >= SCAN_START_DATE) {
                let title = t.baseTitle || t.normalizedTitle;
                // Replace DJ VICKNICK with DJ FLOWERZ
                title = title.replace(/DJ VICKNICK/gi, 'DJ FLOWERZ');

                const artist = title.split(' - ')[0] || 'Unknown Artist';
                const displayTitle = title.split(' - ')[1] || title;

                allScanned.push({
                    source: SOURCES[0].name,
                    id: `scanned_${t.key.replace(/\//g, '_')}`,
                    title: displayTitle,
                    artist: artist,
                    genre: t.month || 'Other',
                    downloadUrl: `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${t.key}`,
                    previewUrl: `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${t.key}`,
                    dateAdded: t.uploaded,
                    status: 'scanned'
                });
            }
        });
    } catch (err) {
        console.error('❌ Error scanning Remix Hub:', err);
    }

    // 2. Scan Video Pool (Assuming we can find a data feed or use the HTML)
    // For now, if HTML, we'd need a parser like ghostly or jsdom. 
    // Given the complexity of environment, I'll assume there's a JSON feed we missed 
    // or I'll try a simple regex on the HTML if possible.
    try {
        const res = await fetch(SOURCES[1].url);
        const html = await res.text();
        // Simple regex for some common patterns if JSON is missing
        // Expectation: Titles are often in <a> or <div> with specific classes
        console.log(`📡 Fetched HTML from Video Pool (${html.length} bytes)`);
        // Placeholder for actual scraping logic if needed
    } catch (err) {
        console.error('❌ Error scanning Video Pool:', err);
    }

    console.log(`✨ Found ${allScanned.length} new tracks since Feb 20, 2026.`);

    if (allScanned.length > 0) {
        // Save to scanned_tracks table in Supabase (as a temporary staging area before R2)
        // or direct to R2 if we have the keys. 
        // The user wants "everything in Cloudflare", so we'll push to R2 eventually.
        // For now, let's upsert to a staging table.
        const { error } = await supabase.from('scanned_tracks').upsert(allScanned, { onConflict: 'id' });
        if (error) console.error('❌ Error saving scanned tracks:', error.message);
        else console.log('✅ Scanned tracks saved to staging.');
    }
}

scanTracks();
