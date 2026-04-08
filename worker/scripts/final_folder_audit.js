import fs from 'fs';
import path from 'path';

const remixFile = './worker/scripts/remix_mashups.json';
const vicknickFile = './worker/scripts/vicknick_tracks.json';

function getHierarchy(file, hubPrefix) {
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const folders = new Set();
    
    data.forEach(item => {
        if (item.key) {
            const parts = item.key.split('/');
            for (let i = 1; i < parts.length; i++) {
                folders.add(parts.slice(0, i).join(' / '));
            }
        }
    });
    return Array.from(folders).sort();
}

function getCreated(file, isRemix) {
     if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const created = new Set();
    
    data.forEach(item => {
        if (isRemix) {
            created.add(item.key ? item.key.split('/')[1] || 'General' : 'General');
        } else {
            created.add(item.month || item.year || 'General');
        }
    });
    return Array.from(created).sort();
}

const remixSource = getHierarchy(remixFile, 'Remix & Mashups Hub');
const remixCreated = getCreated(remixFile, true);

const vicknickSource = getHierarchy(vicknickFile, '');
const vicknickCreated = getCreated(vicknickFile, false);

console.log('# FOLDER AUDIT REPORT');
console.log('\n## Remix & Mashups Hub');
console.log('### Source Folders (Full Hierarchy):');
remixSource.forEach(f => console.log(`  - ${f}`));
console.log('\n### Created Genres (Current Flat Implementation):');
remixCreated.forEach(f => console.log(`  - ${f}`));

console.log('\n## Video Pool');
console.log('### Source Folders (Full Hierarchy):');
vicknickSource.forEach(f => console.log(`  - ${f}`));
console.log('\n### Created Genres (Current Flat Implementation):');
vicknickCreated.forEach(f => console.log(`  - ${f}`));
