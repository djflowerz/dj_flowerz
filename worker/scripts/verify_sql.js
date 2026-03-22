import fs from 'fs';
import path from 'path';

const sqlPath = '/Users/DJFLOWERZ/.gemini/antigravity/scratch/dj_flowerz/worker/scripts/import_pool_full.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const trackIds = new Set();
const versionTrackIds = new Set();

const lines = sql.split('\n');
lines.forEach(line => {
    if (line.startsWith('INSERT INTO tracks')) {
        const matches = line.matchAll(/\('(ext_[^']+)'/g);
        for (const match of matches) {
            trackIds.add(match[1]);
        }
    } else if (line.startsWith('INSERT INTO track_versions')) {
        const matches = line.matchAll(/\('[^']+', '(ext_[^']+)'/g);
        for (const match of matches) {
            versionTrackIds.add(match[1]);
        }
    }
});

console.log(`Tracks in SQL: ${trackIds.size}`);
console.log(`Unique track_ids in versions: ${versionTrackIds.size}`);

const missing = [];
for (const id of versionTrackIds) {
    if (!trackIds.has(id)) {
        missing.push(id);
    }
}

if (missing.length > 0) {
    console.error(`ERROR: ${missing.length} track_ids are missing from tracks table!`);
    console.log("First 5 missing:", missing.slice(0, 5));
} else {
    console.log("SUCCESS: All versions have corresponding tracks in the SQL file.");
}
