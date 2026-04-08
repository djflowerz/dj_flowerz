import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remixFile = path.join(__dirname, 'remix_mashups.json');
const vicknickFile = path.join(__dirname, 'vicknick_tracks.json');

function analyze() {
    const hierarchies = {
        'Remix & Mashups Hub': new Set(),
        'Video Pool': new Set()
    };

    if (fs.existsSync(remixFile)) {
        const data = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
        data.forEach(item => {
            if (item.key) {
                const parts = item.key.split('/');
                if (parts.length > 2) {
                    // Extract everything between hub and filename
                    const hierarchy = parts.slice(1, -1).join(' / ');
                    hierarchies['Remix & Mashups Hub'].add(hierarchy);
                } else if (parts.length === 2) {
                    hierarchies['Remix & Mashups Hub'].add(parts[1]);
                }
            }
        });
    }

    if (fs.existsSync(vicknickFile)) {
        const data = JSON.parse(fs.readFileSync(vicknickFile, 'utf8'));
        data.forEach(item => {
            // Vicknick seems to have month/year/key
            // If it has a key, use it.
            if (item.key) {
                const parts = item.key.split('/');
                if (parts.length > 2) {
                    const hierarchy = parts.slice(1, -1).join(' / ');
                    hierarchies['Video Pool'].add(hierarchy);
                }
            }
            // Also check item.year and item.month as fallbacks
            if (item.year && item.month) {
                hierarchies['Video Pool'].add(`${item.year} / ${item.month}`);
            } else if (item.year) {
                hierarchies['Video Pool'].add(item.year);
            }
        });
    }

    console.log(JSON.stringify({
        remix: Array.from(hierarchies['Remix & Mashups Hub']).sort(),
        vicknick: Array.from(hierarchies['Video Pool']).sort()
    }, null, 2));
}

analyze();
