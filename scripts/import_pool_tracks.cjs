
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../public/data/pool_tracks.json');
const OUTPUT_DIR = path.join(__dirname, '../migrations/pool_imports');
const BATCH_SIZE = 1000;

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function escapeSql(str) {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return str;
    if (typeof str === 'boolean') return str ? 1 : 0;
    return "'" + String(str).replace(/'/g, "''") + "'";
}

async function main() {
    console.log('📖 Reading pool_tracks.json...');
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`✅ Loaded ${data.length} tracks.`);

    let fileCount = 1;
    let trackCount = 0;
    let sql = '-- Music Pool Import Part ' + fileCount + '\n\n';

    for (let i = 0; i < data.length; i++) {
        const track = data[i];

        // 1. Insert into tracks
        const trackSql = `INSERT OR IGNORE INTO tracks (id, title, artist, display_genre, collection_hub, sub_genre, vibe, bpm, release_year, release_month, is_featured, is_active, date_added) VALUES (${escapeSql(track.id)}, ${escapeSql(track.title)}, ${escapeSql(track.artist)}, ${escapeSql(track.displayGenre)}, ${escapeSql(track.collectionHub)}, ${escapeSql(track.subGenre)}, ${escapeSql(track.vibe)}, ${escapeSql(track.bpm)}, ${escapeSql(track.releaseYear)}, ${escapeSql(track.releaseMonth)}, 0, 1, ${escapeSql(track.dateAdded)});\n`;
        sql += trackSql;

        // 2. Insert into track_versions
        if (track.versions && Array.isArray(track.versions)) {
            track.versions.forEach((v, idx) => {
                const versionId = v.id && !v.id.includes('v') ? v.id : `VER-${track.id}-${idx}`;
                const versionSql = `INSERT OR IGNORE INTO track_versions (id, track_id, version_name, preview_url, download_url, is_main_version) VALUES (${escapeSql(versionId)}, ${escapeSql(track.id)}, ${escapeSql(v.type || v.label || 'Original')}, ${escapeSql(v.previewUrl || track.previewUrl)}, ${escapeSql(v.downloadUrl)}, ${idx === 0 ? 1 : 0});\n`;
                sql += versionSql;
            });
        }

        trackCount++;

        if (trackCount >= BATCH_SIZE) {
            const fileName = `import_pool_${String(fileCount).padStart(3, '0')}.sql`;
            fs.writeFileSync(path.join(OUTPUT_DIR, fileName), sql);
            console.log(`✅ Generated ${fileName} (${trackCount} tracks)`);

            fileCount++;
            trackCount = 0;
            sql = '-- Music Pool Import Part ' + fileCount + '\n\n';
        }
    }

    // Write remains
    if (trackCount > 0) {
        const fileName = `import_pool_${String(fileCount).padStart(3, '0')}.sql`;
        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), sql);
        console.log(`✅ Generated ${fileName} (${trackCount} tracks)`);
    }

    console.log('\n🎉 Finished generating SQL import files in migrations/pool_imports/');
}

main().catch(console.error);
