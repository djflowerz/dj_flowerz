import fs from 'fs';

const CDN_BASE = 'https://r2.vicknickvideopool.com';
const API_URL = 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks';

async function main() {
    console.log('🔄 Fetching Remix tracks from Hub...');
    const res = await fetch(API_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch tracks: ${res.status} ${res.statusText}`);
    }
    const tracksData = await res.json();
    console.log(`✅ Fetched ${tracksData.length} track items.`);

    const tracksMap = new Map(); // trackId -> trackRecord
    const versions = [];
    const timestamp = new Date().toISOString();

    for (const item of tracksData) {
        // 1. Generate stable Track ID based on normalizedTitle
        // Use normalized title without spaces/special chars
        const trackBaseId = (item.normalizedTitle || item.baseTitle).toLowerCase().replace(/[^a-z0-9]/g, '');
        const trackId = `ext_${trackBaseId}`;

        // 2. Extract Artist and Title
        let artist = 'Remix & Mashups';
        let title = item.baseTitle;

        if (item.baseTitle.includes(' - ')) {
            const parts = item.baseTitle.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }

        // 3. Construct Track Record (if new)
        if (!tracksMap.has(trackId)) {
            tracksMap.set(trackId, {
                id: trackId,
                title: title.replace(/'/g, "''"),
                artist: artist.replace(/'/g, "''"),
                genre: (item.month || 'Other').replace(/'/g, "''"),
                display_genre: (item.month || 'Other').replace(/'/g, "''"),
                collection_hub: (item.year || 'Remix & Mashups Hub').replace(/'/g, "''"),
                sub_genre: (item.month || 'Other').replace(/'/g, "''"),
                vibe: 'Hype',
                bpm: 0,
                release_year: null,
                release_month: null,
                is_featured: 0,
                is_active: 1,
                date_added: item.uploaded || timestamp,
                created_at: item.uploaded || timestamp,
                updated_at: timestamp
            });
        }

        // 4. Construct Version Record
        // Generate a random-ish but stable-ish ID for the version
        const versionId = `ver_${item.key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${Math.random().toString(36).substring(7)}`;
        const encodedKey = item.key.split('/').map(encodeURIComponent).join('/');
        const url = `${CDN_BASE}/${encodedKey}`;

        versions.push({
            id: versionId,
            track_id: trackId,
            version_name: (item.version || 'Original').replace(/'/g, "''"),
            preview_url: url.replace(/'/g, "''"),
            download_url: url.replace(/'/g, "''"),
            file_size: 0,
            is_main_version: versions.filter(v => v.track_id === trackId).length === 0 ? 1 : 0,
            created_at: item.uploaded || timestamp
        });
    }

    // 5. Generate SQL
    const sqlLines = [];
    const batchSize = 50; // Smaller batch for D1 stability

    // Track Inserts
    const trackRecords = Array.from(tracksMap.values());
    console.log(`📊 Processing ${trackRecords.length} unique tracks...`);
    
    for (let i = 0; i < trackRecords.length; i += batchSize) {
        const chunk = trackRecords.slice(i, i + batchSize);
        const values = chunk.map(t => 
            `('${t.id}', '${t.title}', '${t.artist}', '${t.genre}', '${t.display_genre}', '${t.collection_hub}', '${t.sub_genre}', '${t.vibe}', ${t.bpm}, ${t.release_year}, ${t.release_month}, ${t.is_featured}, ${t.is_active}, '${t.date_added}', '${t.created_at}', '${t.updated_at}')`
        ).join(',\n');
        
        sqlLines.push(`INSERT OR IGNORE INTO tracks (id, title, artist, genre, display_genre, collection_hub, sub_genre, vibe, bpm, release_year, release_month, is_featured, is_active, date_added, created_at, updated_at) VALUES\n${values};`);
    }

    // Version Inserts
    console.log(`📊 Processing ${versions.length} track versions...`);
    for (let i = 0; i < versions.length; i += batchSize) {
        const chunk = versions.slice(i, i + batchSize);
        const values = chunk.map(v => 
            `('${v.id}', '${v.track_id}', '${v.version_name}', '${v.preview_url}', '${v.download_url}', ${v.file_size}, ${v.is_main_version}, '${v.created_at}')`
        ).join(',\n');
        
        sqlLines.push(`INSERT OR IGNORE INTO track_versions (id, track_id, version_name, preview_url, download_url, file_size, is_main_version, created_at) VALUES\n${values};`);
    }

    fs.writeFileSync('import_external.sql', sqlLines.join('\n\n'));
    console.log(`\n✅ Generated import_external.sql with ${trackRecords.length} tracks and ${versions.length} versions.`);
    console.log(`🚀 Next: wrangler d1 execute djflowerz-db --file=import_external.sql`);
}

main().catch(err => {
    console.error('❌ Error during import generation:', err);
    process.exit(1);
});
