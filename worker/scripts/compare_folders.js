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
        const parts = item.key ? item.key.split('/') : (isRemix ? ['Remix & Mashups Hub', item.year, item.month] : [item.year, item.month]);
        for (let i = 1; i < parts.length; i++) {
            sourceFolders.add(parts.slice(0, i).join(' / '));
        }

        // Generated Structure (Current sync_pool.js logic)
        if (isRemix) {
            const parts = item.key ? item.key.split('/') : [];
            const genre = parts[1] || 'General';
            generatedFolders.add(`Remix & Mashups Hub / ${genre}`);
        } else {
            const parts = item.key ? item.key.split('/') : [];
            const year = parts[0] || item.year || '2026';
            const month = parts[1] || item.month || 'General';
            generatedFolders.add(`Video Pool / ${year}`);
            generatedFolders.add(`Video Pool / ${year} / ${month}`);
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
console.log('SOURCE (All Folders in Keys):');
remix.source.slice(0, 20).forEach(f => console.log(`  ${f}`));
if (remix.source.length > 20) console.log(`  ... and ${remix.source.length - 20} more`);

console.log('\nGENERATED (What sync_pool.js creates):');
remix.generated.forEach(f => console.log(`  ${f}`));

console.log('\n--- VIDEO POOL ---');
console.log('SOURCE (All Folders in Keys):');
vicknick.source.slice(0, 20).forEach(f => console.log(`  ${f}`));
if (vicknick.source.length > 20) console.log(`  ... and ${vicknick.source.length - 20} more`);

console.log('\nGENERATED (What sync_pool.js creates):');
vicknick.generated.forEach(f => console.log(`  ${f}`));
