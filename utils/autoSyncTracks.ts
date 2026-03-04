/**
 * Auto-Sync Tracks System
 * Automatically syncs new tracks from external sources to Firestore
 * Sources:
 * 1. Remix & Mashups Hub: https://remix-and-mashups-worker.dennismacharia20.workers.dev
 * 2. VickNick Video Pool: https://r2.vicknickvideopool.com
 */

import { supabase } from './supabase';
import { fetchFromR2, saveToR2 } from './r2';

// Track sources configuration
const TRACK_SOURCES = {
    remixMashups: {
        name: 'Remix & Mashups Hub',
        apiUrl: 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks',
        cdnBase: 'https://cdn.vicknickvideopool.com',
        category: 'Remix & Mashups',
        enabled: true,
    },
    vicknickR2: {
        name: 'VickNick Video Pool',
        apiUrl: 'https://r2.vicknickvideopool.com/api/tracks', // Adjust if different
        cdnBase: 'https://r2.vicknickvideopool.com',
        category: 'R2 Pool',
        enabled: true,
    },
};

export type SourceName = keyof typeof TRACK_SOURCES;

interface ExternalTrack {
    key?: string;
    baseTitle?: string;
    title?: string;
    month?: string;
    artist?: string;
    url?: string;
    downloadUrl?: string;
}

interface R2Track {
    id: string;
    title: string;
    artist: string;
    genre: string;
    category: string[];
    bpm: number;
    year: number;
    previewUrl: string;
    versions: Array<{
        id: string;
        type: string;
        downloadUrl: string;
    }>;
    dateAdded: string;
    originalUploadDate?: string; // Track original source date
}

/**
 * Fetch tracks from Remix & Mashups Hub
 */
async function fetchRemixMashupsTracksAPI(): Promise<ExternalTrack[]> {
    try {
        const response = await fetch(TRACK_SOURCES.remixMashups.apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tracks = await response.json();
        console.log(`✅ Fetched ${tracks.length} tracks from Remix & Mashups Hub`);
        return tracks;
    } catch (error) {
        console.error('❌ Error fetching Remix & Mashups tracks:', error);
        return [];
    }
}

/**
 * Fetch tracks from VickNick R2
 */
async function fetchVickNickR2TracksAPI(): Promise<ExternalTrack[]> {
    try {
        const response = await fetch(TRACK_SOURCES.vicknickR2.apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();

        // Use regex to extract ALL_TRACKS array from the HTML script tag
        const match = html.match(/ALL_TRACKS\s*=\s*(\[[\s\S]*?\]);/);
        if (match && match[1]) {
            try {
                const tracks = JSON.parse(match[1]);
                console.log(`✅ Fetched ${tracks.length} tracks from VickNick R2 via HTML extraction`);
                return tracks;
            } catch (e) {
                console.error('❌ Error parsing extracted JSON from VickNick R2:', e);
            }
        } else {
            console.warn('⚠️  Could not find ALL_TRACKS in VickNick R2 HTML response');
        }
        return [];
    } catch (error) {
        console.error('❌ Error fetching VickNick R2 tracks:', error);
        return [];
    }
}

/**
 * Transform external track to R2Track format
 */
function transformToR2Track(
    externalTrack: ExternalTrack,
    source: typeof TRACK_SOURCES.remixMashups | typeof TRACK_SOURCES.vicknickR2
): R2Track {
    const cdnBase = source.cdnBase;

    // Construct URL based on source
    let previewUrl = '';
    let downloadUrl = '';

    if ('key' in externalTrack && externalTrack.key) {
        // Remix & Mashups format: always needs prepending cdnBase as it only gives keys
        const encodedPath = externalTrack.key.split('/').map(encodeURIComponent).join('/');
        previewUrl = `${cdnBase}/${encodedPath}`;
        downloadUrl = previewUrl;
    } else if (externalTrack.url) {
        // VickNick R2 format: sometimes gives relative paths, sometimes full URLs
        const urlParts = externalTrack.url.split('/');
        const filename = urlParts.pop() || '';
        const encodedFilename = encodeURIComponent(filename).replace(/%20/g, '+');
        const encodedUrl = [...urlParts, encodedFilename].join('/');

        // Ensure absolute URL
        previewUrl = encodedUrl.startsWith('http') ? encodedUrl : `${cdnBase}/${encodedUrl.replace(/^\//, '')}`;

        const rawDl = externalTrack.downloadUrl || externalTrack.url;
        const dlParts = rawDl.split('/');
        const dlFilename = dlParts.pop() || '';
        const encDlFilename = encodeURIComponent(dlFilename).replace(/%20/g, '+');
        const encDlUrl = [...dlParts, encDlFilename].join('/');

        downloadUrl = encDlUrl.startsWith('http') ? encDlUrl : `${cdnBase}/${encDlUrl.replace(/^\//, '')}`;
    }

    let title = externalTrack.baseTitle || externalTrack.title || 'Unknown Title';
    let artist = (externalTrack as any).month || (externalTrack as any).artist || source.category;

    // --- Metadata Cleanup Logic ---
    // Fix cases where Artist is a genre (e.g. "Afro House") and Title is "Artist - Title"
    const GENERIC_ARTISTS = [
        'Afro House', 'Club Edits', 'Dancehall Remixes', 'Amapiano',
        'Reggae Fussion', 'HYPE EDITS', 'Remix & Mashups', 'R2 Pool',
        'REMIXAH', 'DANCEHALL REFIX', 'AFROBEATS', 'HIP HOP EX',
        'VICKNICK', 'VIDEO POOL', 'Kenya Love Songs', 'Kikuyu Gospel',
        'Bongo', 'TBT', 'Kenya Love Songs (Hype)', 'Kenya Love Songs (Low Hype)',
        'Kikuyu Gospel (Kigoco)', 'Bongo TZ Hype', 'Bongo Flava (TBT) (TZ) Hype',
        'Bongo Flava (TBT) (TZ)Low Hype'
    ];

    // Common separators in filenames
    const separators = [' - ', ' – ', ' — ', ' ___ ', ' __ ', ' _ '];

    // If artist is generic or matches the source category, try to split the title
    if (GENERIC_ARTISTS.some(ga => artist.toUpperCase().includes(ga.toUpperCase())) || artist === source.category) {
        let found = false;
        for (const sep of separators) {
            if (title.includes(sep)) {
                const parts = title.split(sep);
                if (parts.length >= 2) {
                    // Heuristic: Some titles are "Genre - Artist - Title" or "Artist - Title"
                    // If first part is a known generic, use second as artist
                    if (GENERIC_ARTISTS.some(ga => parts[0].toUpperCase().includes(ga.toUpperCase()))) {
                        artist = parts[1].trim();
                        title = parts.slice(2).join(sep).trim() || parts[1].trim();
                    } else {
                        // Check if the END of the title looks like an artist (if more than 2 parts)
                        // Or just assume first part is artist
                        artist = parts[0].trim();
                        title = parts.slice(1).join(sep).trim();
                    }

                    found = true;
                    break;
                }
            }
        }

        // Catch formats like "Title Artist" where artist is often at the end after brackets
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
        }
    }
    // -----------------------------

    let genre = source.category;
    const folderContext = ((externalTrack as any).month || (externalTrack as any).key || '').toUpperCase();

    // Check if folder or initial artist field contains a specific genre name
    for (const ga of GENERIC_ARTISTS) {
        if (folderContext.includes(ga.toUpperCase()) || artist.toUpperCase().includes(ga.toUpperCase())) {
            // Map generic labels to slightly nicer genre names if needed
            genre = ga;
            break;
        }
    }

    // Extract year from title or use current year
    const yearMatch = title.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Generate a temporary ID for internal use (will be replaced by DB UUID on insert)
    const trackId = 'temp_' + (downloadUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') || Date.now().toString());

    return {
        id: trackId,
        title: title.trim(),
        artist: artist.trim(),
        genre: genre,
        category: [source.category, 'New'],
        bpm: 0,
        year,
        previewUrl,
        versions: [{ id: 'v1', type: 'Original', downloadUrl }],
        dateAdded: new Date().toISOString(),
        originalUploadDate: (externalTrack as any).uploaded // Pass through from source
    };
}

/**
 * Ensure genre exists in the database, creating it if necessary
 */
async function ensureGenreExists(genreName: string): Promise<void> {
    if (!genreName) return;
    try {
        const existingGenres = await fetchFromR2<any>('genres');
        const exists = existingGenres.some((g: any) => g.name.toLowerCase() === genreName.toLowerCase());

        if (!exists) {
            console.log(`🆕 Creating new genre: ${genreName}`);
            const genreId = genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const newGenre = {
                id: genreId,
                name: genreName,
                cover_url: 'https://cdn.vicknickvideopool.com/default_genre_cover.jpg',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const updatedGenres = [...existingGenres, newGenre];
            await saveToR2('genres', updatedGenres);
        }
    } catch (err) {
        console.error(`Error ensuring genre ${genreName}:`, err);
    }
}

/**
 * Deduplicate the entire pool_tracks collection in R2
 * Returns the number of duplicates removed
 */
export async function deduplicatePool(): Promise<number> {
    try {
        console.log("🧹 Starting full pool deduplication...");
        const existingTracks = await fetchFromR2<R2Track>('pool_tracks');
        if (existingTracks.length === 0) return 0;

        const unique = new Map<string, R2Track>();
        let duplicatesCount = 0;

        // Dedup by downloadUrl (most reliable) and then by id
        existingTracks.forEach(t => {
            const url = t.versions?.[0]?.downloadUrl || (t as any).download_url || t.previewUrl;
            const key = url || t.id;

            if (!unique.has(key)) {
                unique.set(key, t);
            } else {
                duplicatesCount++;
            }
        });

        if (duplicatesCount > 0) {
            console.log(`🧹 Removing ${duplicatesCount} duplicates from pool_tracks. Total unique: ${unique.size}`);
            await saveToR2('pool_tracks', Array.from(unique.values()));
        } else {
            console.log("✨ No duplicates found in pool_tracks.");
        }

        return duplicatesCount;
    } catch (err) {
        console.error("❌ Failed to deduplicate pool:", err);
        return 0;
    }
}

/**
 * Add new tracks to Firestore in batches
 */
async function addTracksToFirestore(tracks: R2Track[], updateExisting: boolean = false): Promise<number> {
    if (tracks.length === 0) return 0;

    // 1. Deduplicate incoming tracks first (within the batch)
    const uniqueIncoming = new Map<string, R2Track>();
    tracks.forEach(t => {
        const url = t.versions[0]?.downloadUrl;
        if (url) {
            // Keep the one that might have more info
            if (!uniqueIncoming.has(url)) {
                uniqueIncoming.set(url, t);
            }
        }
    });

    console.log(`🔍 Checking ${uniqueIncoming.size} unique incoming tracks for duplicates against R2...`);

    let existingTracks: R2Track[] = [];
    let existingUrls = new Set<string>();
    try {
        existingTracks = await fetchFromR2<R2Track>('pool_tracks');
        existingTracks.forEach(item => {
            const url = item.versions?.[0]?.downloadUrl || (item as any).download_url;
            if (url) existingUrls.add(url);
        });
        console.log(`✅ Loaded ${existingUrls.size} existing tracks from R2 for deduplication.`);
    } catch (err) {
        console.error('❌ Failed to load existing tracks from R2.', err);
    }

    // 2. Filter out tracks that already exist in R2
    const filteredTracks = Array.from(uniqueIncoming.values()).filter(t => {
        const url = t.versions[0]?.downloadUrl;
        return url && !existingUrls.has(url);
    });

    if (filteredTracks.length === 0) {
        console.log('✨ All fetched tracks are already in the pool. No new tracks to add.');
        // Still run a quick dedup on existing just in case
        await deduplicatePool();
        return 0;
    }

    // Map results for storage
    const records = filteredTracks.map(t => {
        return {
            ...t,
            id: t.id.startsWith('temp_') ? t.id.replace('temp_', '') : t.id,
            // Ensure schema compatibility
            download_url: t.versions[0].downloadUrl,
            preview_url: t.previewUrl,
            date_added: t.dateAdded
        };
    });

    try {
        console.log(`📤 Saving ${records.length} new tracks to R2 pool_tracks.json...`);
        // We also deduplicate the final combined array here to be absolutely sure
        const combined = [...records, ...existingTracks];
        const finalUnique = new Map();
        combined.forEach((t: any) => {
            const url = t.versions?.[0]?.downloadUrl || t.download_url || t.previewUrl || t.preview_url || t.id;
            if (!finalUnique.has(url)) finalUnique.set(url, t);
        });

        const finalData = Array.from(finalUnique.values());
        await saveToR2('pool_tracks', finalData);
        console.log(`✅ Successfully updated R2 with ${records.length} new tracks. Total: ${finalData.length}`);
        return records.length;
    } catch (err) {
        console.error('❌ Error saving to R2:', err);
        return 0;
    }
}

/**
 * Sync tracks from a specific source
 */
export async function syncTracksFromSource(sourceName: SourceName, updateExisting: boolean = false): Promise<{ total: number; added: number }> {
    if (!TRACK_SOURCES[sourceName]) {
        console.error(`❌ Source ${sourceName} not found`);
        return { total: 0, added: 0 };
    }
    const source = TRACK_SOURCES[sourceName];

    if (!source.enabled) {
        console.log(`⏭️  ${source.name} sync is disabled`);
        return { total: 0, added: 0 };
    }

    console.log(`\n🔄 Syncing tracks from ${source.name}...`);

    // Fetch tracks from API
    let externalTracks: ExternalTrack[] = [];

    if (sourceName === 'remixMashups') {
        externalTracks = await fetchRemixMashupsTracksAPI();
    } else if (sourceName === 'vicknickR2') {
        externalTracks = await fetchVickNickR2TracksAPI();
    }

    if (externalTracks.length === 0) {
        console.log(`⚠️  No tracks fetched from ${source.name}`);
        return { total: 0, added: 0 };
    }

    // Transform to R2Track format
    const r2Tracks = externalTracks.map(track => transformToR2Track(track, source));

    // Filter by recency if source supports it (satisfies "only recently updated")
    let tracksToProcess = r2Tracks;
    const RECENT_THRESHOLD_DAYS = 7; // Only tracks from this week
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - RECENT_THRESHOLD_DAYS);

    if (!updateExisting) {
        tracksToProcess = r2Tracks.filter(t => {
            if (!t.originalUploadDate) return true; // Keep if no date info
            return new Date(t.originalUploadDate) >= recentDate;
        });

        if (tracksToProcess.length < r2Tracks.length) {
            console.log(`📉 Filtered ${r2Tracks.length - tracksToProcess.length} tracks as they are older than ${RECENT_THRESHOLD_DAYS} days.`);
        }
    }

    // Add to Firestore
    const addedCount = await addTracksToFirestore(tracksToProcess, updateExisting);

    console.log(`\n📊 ${source.name} Sync Complete:`);
    console.log(`   Total tracks fetched: ${externalTracks.length}`);
    console.log(`   Tracks eligible (recent): ${tracksToProcess.length}`);
    console.log(`   New tracks added: ${addedCount}`);
    console.log(`   Already existing or skipped: ${tracksToProcess.length - addedCount}`);

    return { total: externalTracks.length, added: addedCount };
}

/**
 * Sync all enabled sources
 */
export async function syncAllSources(updateExisting: boolean = false): Promise<{
    remixMashups: { total: number; added: number };
    vicknickR2: { total: number; added: number };
    totalAdded: number;
}> {
    console.log('🚀 Starting Auto-Sync for all sources...\n');
    console.log('='.repeat(60));

    const results = {
        remixMashups: { total: 0, added: 0 },
        vicknickR2: { total: 0, added: 0 },
        totalAdded: 0,
    };

    // Sync Remix & Mashups
    if (TRACK_SOURCES.remixMashups.enabled) {
        results.remixMashups = await syncTracksFromSource('remixMashups', updateExisting);
    }

    // Sync VickNick R2
    if (TRACK_SOURCES.vicknickR2.enabled) {
        results.vicknickR2 = await syncTracksFromSource('vicknickR2', updateExisting);
    }

    results.totalAdded = results.remixMashups.added + results.vicknickR2.added;

    console.log('\n' + '='.repeat(60));
    console.log('✅ Auto-Sync Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Total new tracks added: ${results.totalAdded}`);
    console.log(`   - Remix & Mashups: ${results.remixMashups.added}`);
    console.log(`   - VickNick R2: ${results.vicknickR2.added}`);
    console.log('='.repeat(60));

    return results;
}

/**
 * Schedule periodic sync (for use in background jobs)
 */
export function schedulePeriodicSync(intervalHours: number = 6): NodeJS.Timeout {
    console.log(`⏰ Scheduling auto-sync every ${intervalHours} hours`);

    // Run immediately on start
    syncAllSources();

    // Then run periodically
    return setInterval(() => {
        console.log(`\n⏰ Scheduled sync triggered at ${new Date().toISOString()}`);
        syncAllSources();
    }, intervalHours * 60 * 60 * 1000);
}

/**
 * Manual sync trigger (for admin dashboard)
 */
export async function manualSync(updateExisting: boolean = false): Promise<{
    success: boolean;
    message: string;
    results?: any;
}> {
    try {
        const results = await syncAllSources(updateExisting);
        return {
            success: true,
            message: `Successfully synced ${results.totalAdded} new tracks`,
            results,
        };
    } catch (error) {
        console.error('❌ Manual sync failed:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
