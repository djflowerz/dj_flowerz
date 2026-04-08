import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const remixFile = path.join(__dirname, 'remix_mashups.json');
const vicknickFile = path.join(__dirname, 'vicknick_tracks.json');

console.log('--- REMIX & MASHUPS HUB FOLDERS ---');
if (fs.existsSync(remixFile)) {
    const remixData = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
    const folders = new Set();
    remixData.forEach(item => {
        if (item.key) {
            const parts = item.key.split('/');
            if (parts.length > 2) {
                folders.add(`${parts[1]} / ${parts[2]}`);
            } else if (parts.length > 1) {
                folders.add(parts[1]);
            }
        } else {
            folders.add(`${item.year} / ${item.month}`);
        }
    });
    Array.from(folders).sort().forEach(f => console.log(`  - ${f}`));
}

console.log('\n--- VIDEO POOL FOLDERS ---');
if (fs.existsSync(vicknickFile)) {
    const vicknickData = JSON.parse(fs.readFileSync(vicknickFile, 'utf8'));
    const folders = new Set();
    vicknickData.forEach(item => {
        if (item.key) {
            const parts = item.key.split('/');
            // Expected format: Year / Month / Subfolder (if any)
            if (parts.length > 3) {
                folders.add(`${parts[0]} / ${parts[1]} / ${parts[2]}`);
            } else if (parts.length > 2) {
                folders.add(`${parts[0]} / ${parts[1]}`);
            } else if (parts.length > 1) {
                folders.add(parts[0]);
            }
        } else {
            folders.add(`${item.year} / ${item.month}`);
        }
    });
    Array.from(folders).sort().forEach(f => console.log(`  - ${f}`));
}
