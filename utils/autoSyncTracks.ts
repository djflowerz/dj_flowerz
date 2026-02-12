/**
 * Auto-Sync Tracks System
 * Automatically syncs new tracks from external sources to Firestore
 * Sources:
 * 1. Remix & Mashups Hub: https://remix-and-mashups-worker.dennismacharia20.workers.dev
 * 2. VickNick Video Pool: https://r2.vicknickvideopool.com
 */

import { db } from '../firebase';

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
        const tracks = await response.json();
        console.log(`✅ Fetched ${tracks.length} tracks from VickNick R2`);
        return tracks;
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

    if (externalTrack.key) {
        // Remix & Mashups format
        const encodedPath = externalTrack.key.split('/').map(encodeURIComponent).join('/');
        previewUrl = `${cdnBase}/${encodedPath}`;
        downloadUrl = previewUrl;
    } else if (externalTrack.url) {
        // VickNick R2 format
        previewUrl = externalTrack.url;
        downloadUrl = externalTrack.downloadUrl || externalTrack.url;
    }

    let title = externalTrack.baseTitle || externalTrack.title || 'Unknown Title';
    let artist = externalTrack.month || externalTrack.artist || source.category;

    // --- Metadata Cleanup Logic ---
    // Fix cases where Artist is a genre (e.g. "Afro House") and Title is "Artist - Title"
    const GENERIC_ARTISTS = [
        'Afro House', 'Club Edits', 'Dancehall Remixes', 'Amapiano',
        'Reggae Fussion', 'HYPE EDITS', 'Remix & Mashups', 'R2 Pool'
    ];

    if (GENERIC_ARTISTS.includes(artist) || artist === source.category) {
        // Check if title has " - " separator
        const separator = ' - ';
        if (title.includes(separator)) {
            const parts = title.split(separator);
            if (parts.length >= 2) {
                // Heuristic: "Artist - Title"
                // Assuming the first part is the Artist
                artist = parts[0].trim();
                title = parts.slice(1).join(separator).trim();
            }
        }
    }
    // -----------------------------

    // Extract year from title or use current year
    const yearMatch = title.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Generate unique ID from download URL
    const trackId = downloadUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') ||
        `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
        id: trackId,
        title,
        artist,
        genre: source.category,
        category: [source.category],
        bpm: 0,
        year,
        previewUrl,
        versions: [
            {
                id: 'v1',
                type: 'Original',
                downloadUrl,
            },
        ],
        dateAdded: new Date().toISOString(),
    };
}

/**
 * Check if track already exists in Firestore
 */
async function trackExists(downloadUrl: string): Promise<boolean> {
    try {
        // Fallback: check by downloadUrl in versions array manually due to array-contains limitation with object equality
        // Or if we query just by 'downloadUrl' if stored separately.
        // But for now, let's keep it consistent
        // Actually, listing all is safer but expensive.
        // Let's optimize: query by 'id' if possible? No the ID is generated.

        // Simple optimization: Just check if any version has this downloadUrl.
        // Unfortunately, Firestore doesn't support 'array-contains-any-field'.
        // We stick to listing all as safer fallback but maybe limit?

        // BETTER: Query where 'versions' array contains EXACT object we create?
        // But that assumes we constructed it exactly same way before.
        // Let's just fetch all 'poolTracks' and iterate.
        // For production scale (thousands), this should be cached or specialized index.

        const allTracks = await db.collection('poolTracks').get();
        for (const doc of allTracks.docs) {
            const track = doc.data();
            // Check in versions array
            if (track.versions?.some((v: any) => v.downloadUrl === downloadUrl)) {
                return true;
            }
        }
        return false;

    } catch (err) {
        console.error('Error checking track existence:', err);
        return false;
    }
}

/**
 * Add new tracks to Firestore
 */
async function addTracksToFirestore(tracks: R2Track[]): Promise<number> {
    let addedCount = 0;

    for (const track of tracks) {
        try {
            const downloadUrl = track.versions[0]?.downloadUrl;

            if (!downloadUrl) {
                console.warn(`⚠️  Skipping track without download URL: ${track.title}`);
                continue;
            }

            // Check if track already exists
            const exists = await trackExists(downloadUrl);

            if (exists) {
                // console.log(`⏭️  Track already exists: ${track.title}`); // Verbose log
                continue;
            }

            // Add new track to 'poolTracks'
            await db.collection('poolTracks').add(track);
            addedCount++;
            console.log(`✅ Added: ${track.title} by ${track.artist}`);

        } catch (error) {
            console.error(`❌ Error adding track ${track.title}:`, error);
        }
    }

    return addedCount;
}

/**
 * Sync tracks from a specific source
 */
async function syncTracksFromSource(
    sourceName: 'remixMashups' | 'vicknickR2'
): Promise<{ total: number; added: number }> {
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

    // Add to Firestore
    const addedCount = await addTracksToFirestore(r2Tracks);

    console.log(`\n📊 ${source.name} Sync Complete:`);
    console.log(`   Total tracks fetched: ${externalTracks.length}`);
    console.log(`   New tracks added: ${addedCount}`);
    console.log(`   Duplicates skipped: ${externalTracks.length - addedCount}`);

    return { total: externalTracks.length, added: addedCount };
}

/**
 * Sync all enabled sources
 */
export async function syncAllSources(): Promise<{
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
        results.remixMashups = await syncTracksFromSource('remixMashups');
    }

    // Sync VickNick R2
    if (TRACK_SOURCES.vicknickR2.enabled) {
        results.vicknickR2 = await syncTracksFromSource('vicknickR2');
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
export async function manualSync(): Promise<{
    success: boolean;
    message: string;
    results?: any;
}> {
    try {
        const results = await syncAllSources();
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
