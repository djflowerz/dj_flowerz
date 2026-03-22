import fs from 'node:fs';
import path from 'node:path';

// Load Vicknick HTML data
const vicknickHtmlFile = 'worker/scripts/vicknick_home.html';
const vicknickHtml = fs.readFileSync(vicknickHtmlFile, 'utf8');

// Also load Remix Mashups data if exists
let remixMashups = [];
if (fs.existsSync('worker/scripts/remix_mashups.json')) {
    const remixJson = fs.readFileSync('worker/scripts/remix_mashups.json', 'utf8');
    if (remixJson.trim().length > 0) {
        try {
            remixMashups = JSON.parse(remixJson);
        } catch (e) {
            console.error('Error parsing remix_mashups.json:', e.message);
        }
    }
}

// Function to extract JSON from the HTML
function extractAllTracks(html) {
    const regex = /const\s+ALL_TRACKS\s*=\s*(\[[\s\S]*?\]);/m;
    const match = html.match(regex);
    if (!match) return [];
    try {
        return JSON.parse(match[1]);
    } catch (e) {
        console.error('Error parsing ALL_TRACKS JSON:', e.message);
        return [];
    }
}

const vicknickTracks = extractAllTracks(vicknickHtml);
console.log(`- Vicknick tracks found in HTML: ${vicknickTracks.length}`);
console.log(`- Remix Mashups tracks found: ${remixMashups.length}`);

// Combine all tracks
const allTracks = [...vicknickTracks, ...remixMashups];

// Mapping results
const tracksSet = new Set();
const tracks = [];
const versions = [];
const stats = {
    hubs: {},
    genres: {}
};

function processTrack(sourceTrack) {
    let key = sourceTrack.key || sourceTrack.id;
    if (!key) return;

    // "DJ VICKNICK" -> "DJ FLOWERZ"
    let title = sourceTrack.title || path.basename(key, path.extname(key));
    title = title.replace(/DJ\s+VICKNICK/gi, 'DJ FLOWERZ');

    const artist = sourceTrack.artist || 'Unknown Artist';
    
    // Map hub and genre based on path
    let hub = 'Video Pool';
    let genre = 'Unsorted';
    const parts = key.split('/');

    if (parts.length >= 2) {
        const first = parts[0];
        const second = parts[1];

        if (first === 'Locals') {
            hub = 'Locals';
            genre = second;
        } else if (first === 'Genres') {
            // Check if it's a known local genre
            const localGenres = ['Kikuyu', 'Kamba', 'Luhya', 'Kalenjin', 'Arbantone', 'Gengetone', 'Mugithi', 'Kigocco', 'Kigoco'];
            const isLocal = localGenres.some(g => second.includes(g));
            
            if (isLocal) {
                hub = 'Locals';
                genre = second;
            } else {
                hub = 'Genres';
                genre = second;
            }
        } else if (first === 'Remix & Mashups Hub') {
            hub = 'Remix & Mashups Hub';
            genre = second;
        } else if (first.includes('VIDEO POOL EDITS')) {
            hub = first; // Maintain the specific year edits
            genre = second;
        } else if (first === 'Riddim Videos' || first === 'Riddimz F\'') {
            hub = first;
            genre = second;
        } else {
            // General Video Pool
            hub = 'Video Pool';
            genre = first;
        }
    }

    // Stats
    stats.hubs[hub] = (stats.hubs[hub] || 0) + 1;
    stats.genres[genre] = (stats.genres[genre] || 0) + 1;

    // Track ID (use key as unique identifier)
    const trackId = key;

    if (!tracksSet.has(trackId)) {
        tracks.push({
            id: trackId,
            title: title,
            artist: artist,
            display_genre: genre,
            collection_hub: hub,
            release_year: 2026,
            is_video: key.toLowerCase().endsWith('.mp4') || key.toLowerCase().endsWith('.mkv') ? 1 : 0
        });
        tracksSet.add(trackId);
    }

    // Version
    const extension = path.extname(key).replace('.', '').toLowerCase();
    const isVideo = tracks.find(t => t.id === trackId).is_video;
    
    // Download URL should be immediate (via worker proxy)
    const baseUrl = 'https://r2.vicknickvideopool.com/api/pool/download';
    const downloadUrl = `${baseUrl}?key=${encodeURIComponent(key)}&download=true`;
    const previewUrl = `https://r2.vicknickvideopool.com/api/pool/download?key=${encodeURIComponent(key)}`;

    versions.push({
        id: `v_${Buffer.from(key).toString('hex').slice(0, 16)}`,
        track_id: trackId,
        version_name: 'Original',
        is_video: isVideo,
        file_extension: extension,
        file_size: 0,
        download_url: downloadUrl,
        preview_url: previewUrl
    });
}

allTracks.forEach(processTrack);

console.log('Final Hub Counts:');
for (const [hub, count] of Object.entries(stats.hubs)) {
    console.log(`- ${hub}: ${count}`);
}

// Generate SQL
function escape(str) {
    if (str === null || str === undefined) return "''";
    return `'${String(str).replace(/'/g, "''")}'`;
}

let sqlTracks = '';
tracks.forEach(t => {
    sqlTracks += `INSERT OR REPLACE INTO tracks (id, title, artist, display_genre, collection_hub, release_year) VALUES (${escape(t.id)}, ${escape(t.title)}, ${escape(t.artist)}, ${escape(t.display_genre)}, ${escape(t.collection_hub)}, ${t.release_year});\n`;
});

let sqlVersions = '';
versions.forEach(v => {
    // Map file_extension to format, and set is_main_version to 1
    sqlVersions += `INSERT OR REPLACE INTO track_versions (id, track_id, version_name, is_video, format, file_size, download_url, preview_url, file_url, is_main_version) VALUES (${escape(v.id)}, ${escape(v.track_id)}, ${escape(v.version_name)}, ${v.is_video}, ${escape(v.file_extension)}, ${escape(v.file_size)}, ${escape(v.download_url)}, ${escape(v.preview_url)}, ${escape(v.preview_url)}, 1);\n`;
});

fs.writeFileSync('worker/scripts/import_tracks.sql', sqlTracks);
fs.writeFileSync('worker/scripts/import_versions.sql', sqlVersions);

console.log(`- Generated import_tracks.sql (${tracks.length} tracks)`);
console.log(`- Generated import_versions.sql (${versions.length} versions)`);
