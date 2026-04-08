import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remixFile = path.join(__dirname, 'remix_mashups.json');
const vicknickFile = path.join(__dirname, 'vicknick_tracks.json');

function mapHierarchy() {
    const mapping = [];

    if (fs.existsSync(remixFile)) {
        const data = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
        const uniquePaths = new Set();
        data.forEach(item => {
            if (item.key) {
                const parts = item.key.split('/');
                if (parts.length > 2) {
                    const folderPath = parts.slice(1, -1).join(' / ');
                    const r2Prefix = parts.slice(0, -1).join('/');
                    uniquePaths.add(`${folderPath}|Remix Hub|${r2Prefix}`);
                }
            }
        });
        Array.from(uniquePaths).forEach(val => {
            const [folder, hub, prefix] = val.split('|');
            mapping.push({ folder, hub, prefix });
        });
    }

    if (fs.existsSync(vicknickFile)) {
        const data = JSON.parse(fs.readFileSync(vicknickFile, 'utf8'));
        const uniquePaths = new Set();
        data.forEach(item => {
            if (item.key) {
                const parts = item.key.split('/');
                if (parts.length > 2) {
                    const folderPath = parts.slice(1, -1).join(' / ');
                    const r2Prefix = parts.slice(0, -1).join('/');
                    uniquePaths.add(`${folderPath}|Video Pool|${r2Prefix}`);
                }
            }
        });
        Array.from(uniquePaths).forEach(val => {
            const [folder, hub, prefix] = val.split('|');
            mapping.push({ folder, hub, prefix });
        });
    }

    // Sort by hub then folder
    mapping.sort((a, b) => a.hub.localeCompare(b.hub) || a.folder.localeCompare(b.folder));

    console.log(JSON.stringify(mapping, null, 2));
}

mapHierarchy();
