import fs from 'fs';
import path from 'path';

const remixFile = './worker/scripts/remix_mashups.json';
const vicknickFile = './worker/scripts/vicknick_tracks.json';

function getComprehensiveHierarchy(file, hubPrefix) {
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const folders = new Set();
    
    data.forEach(item => {
        if (item.key) {
            const parts = item.key.split('/');
            // Source path traversal
            for (let i = 1; i < parts.length; i++) {
                const folderPath = parts.slice(0, i).join(' / ');
                if (folderPath) folders.add(folderPath);
            }
        } else if (item.year && item.month) {
            // Case for items without keys but with year/month
            folders.add(item.year);
            folders.add(`${item.year} / ${item.month}`);
        }
    });
    return Array.from(folders).sort();
}

console.log('=== SOURCE FOLDERS: Remix & Mashups Hub ===');
const remixSource = getComprehensiveHierarchy(remixFile, 'Remix & Mashups Hub');
remixSource.forEach(f => console.log(f));

console.log('\n=== SOURCE FOLDERS: Video Pool ===');
const vicknickSource = getComprehensiveHierarchy(vicknickFile, '');
vicknickSource.forEach(f => console.log(f));
