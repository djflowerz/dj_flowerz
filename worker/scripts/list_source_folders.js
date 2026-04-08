import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const remixFile = path.join(__dirname, 'remix_mashups.json');
const vicknickFile = path.join(__dirname, 'vicknick_tracks.json');

function getSourceFolders(file, hubPrefix) {
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const folders = new Set();
    data.forEach(item => {
        if (item.key) {
            const parts = item.key.split('/');
            if (parts[0] === hubPrefix) {
                // Return full hierarchy found in key
                for (let i = 1; i < parts.length - 1; i++) {
                    folders.add(parts.slice(0, i + 1).join(' / '));
                }
            } else {
                 // Video Pool style (Year/Month/...)
                 for (let i = 0; i < parts.length - 1; i++) {
                    folders.add(parts.slice(0, i + 1).join(' / '));
                }
            }
        }
    });
    return Array.from(folders).sort();
}

console.log('--- SOURCE FOLDERS: Remix & Mashups Hub ---');
getSourceFolders(remixFile, 'Remix & Mashups Hub').forEach(f => console.log(f));

console.log('\n--- SOURCE FOLDERS: Video Pool ---');
getSourceFolders(vicknickFile, '').forEach(f => console.log(f));
