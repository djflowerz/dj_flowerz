import fs from 'fs';
import path from 'path';

const remixFile = './worker/scripts/remix_mashups.json';
const vicknickFile = './worker/scripts/vicknick_tracks.json';

function getStructure(file, isRemix) {
    if (!fs.existsSync(file)) return { source: new Set(), generated: new Set() };
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const sourceFolders = new Set();
    const generatedFolders = new Set();

    data.forEach(item => {
        // Source Structure
        if (item.key) {
            const parts = item.key.split('/');
            for (let i = 1; i < parts.length; i++) {
                sourceFolders.add(parts.slice(0, i).join(' / '));
            }
        }

        // Generated Structure (Current sync_pool.js logic)
        if (isRemix) {
            const genre = item.key ? item.key.split('/')[1] || 'General' : 'General';
            generatedFolders.add(genre);
        } else {
            const genre = item.month || item.year || 'General';
            generatedFolders.add(genre);
        }
    });

    return {
        source: Array.from(sourceFolders).sort(),
        generated: Array.from(generatedFolders).sort()
    };
}

const remix = getStructure(remixFile, true);
const vicknick = getStructure(vicknickFile, false);

console.log('--- REMIX & MASHUPS HUB ---');
console.log('SOURCE FOLDERS:');
remix.source.slice(0, 10).forEach(f => console.log(`  ${f}`));
if (remix.source.length > 10) console.log(`  ... and ${remix.source.length - 10} more`);

console.log('\nGENERATED GENRES (Current sync_pool.js):');
remix.generated.slice(0, 10).forEach(f => console.log(`  ${f}`));

console.log('\n--- VIDEO POOL ---');
console.log('SOURCE FOLDERS:');
vicknick.source.slice(0, 10).forEach(f => console.log(`  ${f}`));

console.log('\nGENERATED GENRES (Current sync_pool.js):');
vicknick.generated.slice(0, 10).forEach(f => console.log(`  ${f}`));
