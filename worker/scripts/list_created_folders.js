import fs from 'fs';
import path from 'path';

const remixFile = './worker/scripts/remix_mashups.json';
const vicknickFile = './worker/scripts/vicknick_tracks.json';

function getCreatedHierarchies() {
    const created = {
        'Remix & Mashups Hub': new Set(),
        'Video Pool': new Set()
    };

    if (fs.existsSync(remixFile)) {
        const remixData = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
        remixData.forEach(item => {
            const genre = item.key ? item.key.split('/')[1] || 'General' : 'General';
            created['Remix & Mashups Hub'].add(genre);
        });
    }

    if (fs.existsSync(vicknickFile)) {
        const vicknickData = JSON.parse(fs.readFileSync(vicknickFile, 'utf8'));
        vicknickData.forEach(item => {
            const genre = item.month || item.year || 'General';
            created['Video Pool'].add(genre);
        });
    }

    return {
        'Remix & Mashups Hub': Array.from(created['Remix & Mashups Hub']).sort(),
        'Video Pool': Array.from(created['Video Pool']).sort()
    };
}

const result = getCreatedHierarchies();

console.log('--- CREATED FOLDERS (Current Implementation) ---');
Object.entries(result).forEach(([hub, folders]) => {
    console.log(`\n[${hub}]`);
    folders.forEach(f => console.log(`  - ${f}`));
});
