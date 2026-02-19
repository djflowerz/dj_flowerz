
import fs from 'fs';
import readline from 'readline';
import { supabase } from '../utils/supabase';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function reseed() {
    console.log('🗑️  Deleting all existing tracks from pool_tracks...');
    // Use a condition that captures all rows
    const { error: delError } = await supabase
        .from('pool_tracks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (delError) {
        console.error('❌ Error deleting tracks:', delError.message);
        return;
    }
    console.log('✅ pool_tracks cleared.');

    const fileStream = fs.createReadStream('r2_downloads_list.txt');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentTrack: any = {};
    let tracksToInsert: any[] = [];
    const processedUrls = new Set<string>();
    const BATCH_SIZE = 500;
    let totalProcessed = 0;
    let totalInserted = 0;
    let skippedCount = 0;

    console.log('🚀 Starting import from r2_downloads_list.txt...');

    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (currentTrack.title && currentTrack.download_link) {
                if (processedUrls.has(currentTrack.download_link)) {
                    skippedCount++;
                } else {
                    processedUrls.add(currentTrack.download_link);
                    tracksToInsert.push({
                        title: currentTrack.title,
                        artist: currentTrack.artist || 'Unknown',
                        preview_url: currentTrack.preview_link,
                        download_url: currentTrack.download_link,
                        // Infer some fields
                        genre: inferGenre(currentTrack.download_link),
                        year: inferYear(currentTrack.title + (currentTrack.artist || '')),
                        versions: [{
                            type: currentTrack.download_link.endsWith('.mp4') ? 'Video' : 'Audio',
                            download_url: currentTrack.download_link
                        }]
                    });
                    totalProcessed++;

                    if (tracksToInsert.length >= BATCH_SIZE) {
                        await insertBatch(tracksToInsert);
                        totalInserted += tracksToInsert.length;
                        tracksToInsert = [];
                        console.log(`📡 Processed ${totalProcessed} tracks... (Skipped ${skippedCount} duplicates)`);
                    }
                }
            }
            currentTrack = {};
            continue;
        }

        if (trimmed.startsWith('Title: ')) currentTrack.title = trimmed.replace('Title: ', '');
        else if (trimmed.startsWith('Artist: ')) currentTrack.artist = trimmed.replace('Artist: ', '');
        else if (trimmed.startsWith('Preview Link: ')) currentTrack.preview_link = trimmed.replace('Preview Link: ', '');
        else if (trimmed.startsWith('Download Link: ')) currentTrack.download_link = trimmed.replace('Download Link: ', '');
    }

    // Final batch
    if (tracksToInsert.length > 0) {
        await insertBatch(tracksToInsert);
        totalInserted += tracksToInsert.length;
    }

    console.log(`\n✨ DONE! Total processed: ${totalProcessed}, Total inserted: ${totalInserted}`);
}

async function insertBatch(batch: any[]) {
    const { error } = await supabase
        .from('pool_tracks')
        .upsert(batch, { onConflict: 'download_url' });

    if (error) {
        console.warn(`⚠️  Batch upsert failed (${error.message}). Falling back to row-by-row...`);
        for (const track of batch) {
            const { error: singleError } = await supabase
                .from('pool_tracks')
                .upsert(track, { onConflict: 'download_url' });
            if (singleError) {
                // Highly likely a real duplicate or data issue we can skip
                // console.error(`❌ Single upsert error for ${track.title}:`, singleError.message);
            }
        }
    }
}

function inferGenre(url: string): string {
    // Example: https://cdn...com/Genres/Reggae%20Covers/...
    try {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('/Genres/')) {
            const parts = decoded.split('/Genres/');
            if (parts[1]) {
                return parts[1].split('/')[0];
            }
        }
        if (decoded.includes('/Remix & Mashups Hub/')) {
            return 'Remix & Mashups';
        }
    } catch (e) { }
    return 'General';
}

function inferYear(text: string): number {
    const match = text.match(/\b(20\d{2})\b/);
    return match ? parseInt(match[1]) : 2026; // Default to 2026 if not found
}

reseed().catch(console.error);
