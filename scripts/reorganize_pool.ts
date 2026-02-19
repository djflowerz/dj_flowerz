
import fs from 'fs';
import readline from 'readline';
import { supabase } from '../utils/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

// Interfaces
interface Track {
    title: string;
    artist: string;
    genre: string;
    sub_genre?: string;
    year: number;
    month?: string; // e.g: "JANUARY"
    preview_url: string;
    download_url: string;
    versions: any[];
}

const BASE_URL = 'https://cdn.vicknickvideopool.com';

async function processFile() {
    console.log('🚀 Starting comprehensive track re-categorization...');

    // 1. Clear existing tracks first? (Optional, maybe safer to upsert but user asked to use this list)
    // For now let's assume we are REPLACING or UPDATING. User said "place all tracks... as per the links".
    // We will use upsert to avoid duplicate key errors on download_url

    const fileStream = fs.createReadStream('music_track_list.txt');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let tracksToInsert: Track[] = [];
    const BATCH_SIZE = 500;
    let totalProcessed = 0;
    let skippedCount = 0;
    const processedUrls = new Set<string>();

    for await (const line of rl) {
        if (!line.trim() || line.startsWith('FILE_NAME |')) continue;

        const parts = line.split(' | ');
        if (parts.length < 5) continue;

        const fileName = parts[0].trim();
        const artist = parts[1].trim();
        const title = parts[2].trim();
        const yearStr = parts[3].trim(); // "N/A" often
        const folderPath = parts[4].trim(); // Crucial: "2020 VIDEO POOL EDITS/MARCH 2020 EDITS" or "Remix & Mashups Hub/Redrums Video Remixes"

        // Construct Full URL
        // The file content shows fileName.mp4 at the start, but we need to match it to the URL structure.
        // Usually: BASE_URL + / + encode(folderPath) + / + encode(fileName)
        // We need to be careful with encoding.

        let downloadUrl = `${BASE_URL}/${folderPath}/${fileName}`;
        // Smart encoding: split by slash, encode each component
        downloadUrl = downloadUrl.split('/').map(p => {
            // Don't encode the protocol slashes http://
            if (p === 'https:' || p === '' || p === 'cdn.vicknickvideopool.com') return p;
            return encodeURIComponent(p);
        }).join('/');

        // Fix double slash issue if any (except protocol)
        downloadUrl = downloadUrl.replace(/([^:]\/)\/+/g, "$1");

        if (processedUrls.has(downloadUrl)) {
            skippedCount++;
            continue;
        }
        processedUrls.add(downloadUrl);

        // Extract Metadata from Folder Path
        const metadata = parseFolderPath(folderPath);

        // Infer Year if "N/A"
        let year = parseInt(yearStr);
        if (isNaN(year)) {
            year = metadata.year || inferYear(fileName) || 2026;
        }

        const track: Track = {
            title: title || fileName,
            artist: artist || 'Unknown Artist',
            genre: metadata.genre, // High level genre: "2020 Edits", "Remix & Mashups", etc.
            sub_genre: metadata.subGenre, // "March 2020 Edits", "Redrums"
            year: year,
            month: metadata.month, // "MARCH"
            preview_url: downloadUrl, // Usually same as download for this pool
            download_url: downloadUrl,
            versions: [{
                type: fileName.toLowerCase().endsWith('.mp4') ? 'Video' : 'Audio',
                download_url: downloadUrl
            }]
        };

        tracksToInsert.push(track);
        totalProcessed++;

        if (tracksToInsert.length >= BATCH_SIZE) {
            await upsertBatch(tracksToInsert);
            tracksToInsert = [];
            console.log(`📡 Processed ${totalProcessed} tracks...`);
        }
    }

    if (tracksToInsert.length > 0) {
        await upsertBatch(tracksToInsert);
    }

    console.log(`✅ Finished! Processed: ${totalProcessed}, Skipped Duplicates: ${skippedCount}`);
}

function parseFolderPath(path: string): { genre: string, subGenre?: string, year?: number, month?: string } {
    // Examples:
    // "2020 VIDEO POOL EDITS/MARCH 2020 EDITS"
    // "Remix & Mashups Hub/Redrums Video Remixes"
    // "Genres/Reggae Covers"

    const parts = path.split('/');
    const root = parts[0];
    const sub = parts[1] || '';

    let genre = 'General';
    let subGenre = '';
    let year: number | undefined;
    let month: string | undefined;

    // 1. Year-based Collections (e.g., "2020 VIDEO POOL EDITS")
    const yearMatch = root.match(/^(\d{4})\s+VIDEO POOL EDITS/i);
    if (yearMatch) {
        year = parseInt(yearMatch[1]);
        genre = `${year} Edits`; // e.g., "2020 Edits"

        // Check subfolder for Month (e.g., "MARCH 2020 EDITS")
        const monthMatch = sub.match(/^(\w+)\s+\d{4}\s+EDITS/i);
        if (monthMatch) {
            month = monthMatch[1].toUpperCase();
            subGenre = `${month} ${year}`;
        } else {
            subGenre = sub || 'General';
        }
        return { genre, subGenre, year, month };
    }

    // 2. Genres Folder
    if (root.toLowerCase() === 'genres') {
        genre = sub || 'General';
        subGenre = parts[2] || '';
        return { genre, subGenre };
    }

    // 3. Remixes
    if (root.includes('Remix') || root.includes('Mashups')) {
        genre = 'Remix & Mashups';
        subGenre = sub || 'General';
        return { genre, subGenre };
    }

    // Default: use root folder as genre
    genre = root;
    subGenre = sub;

    return { genre, subGenre, year, month };
}

function inferYear(text: string): number {
    const match = text.match(/\b(20\d{2})\b/);
    return match ? parseInt(match[1]) : 0;
}

async function upsertBatch(batch: Track[]) {
    // We need to handle the schema. 
    // Does 'pool_tracks' have 'month' or 'sub_genre' columns? 
    // The previous schema dump showed: category TEXT[], genre TEXT, year INTEGER.
    // We might need to store hierarchy in 'category' array or 'genre'.
    // Let's map our rich metadata to the existing schema.

    const dbBatch = batch.map(t => ({
        title: t.title,
        artist: t.artist,
        // Map Genre -> Genre column
        genre: t.genre,
        // Map Sub-genre/Month -> Category Array
        category: [t.sub_genre, t.month].filter(Boolean),
        year: t.year,
        preview_url: t.preview_url,
        download_url: t.download_url,
        versions: t.versions,
        // updated_at column does not exist, so we remove it
    }));

    const { error } = await supabase
        .from('pool_tracks')
        .upsert(dbBatch, { onConflict: 'download_url' });

    if (error) {
        console.warn(`⚠️ Batch upsert failed: ${error.message}. Retrying row-by-row...`);
        for (const item of dbBatch) {
            await supabase.from('pool_tracks').upsert(item, { onConflict: 'download_url' });
        }
    }
}

processFile().catch(console.error);
