import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remixFile = path.join(__dirname, 'remix_mashups.json');
const vicknickFile = path.join(__dirname, 'vicknick_tracks.json');

function findFolders(keyword) {
    console.log(`\nSearching for: "${keyword}"`);
    
    if (fs.existsSync(remixFile)) {
        const data = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
        const matches = data.filter(item => item.key && item.key.toLowerCase().includes(keyword.toLowerCase()));
        console.log(`  Remix Hub: Found ${matches.length} matches.`);
        if (matches.length > 0) {
            console.log(`  Example Keys:`);
            matches.slice(0, 5).forEach(m => console.log(`    - ${m.key}`));
        }
    }

    if (fs.existsSync(vicknickFile)) {
        const data = JSON.parse(fs.readFileSync(vicknickFile, 'utf8'));
        const matches = data.filter(item => item.key && item.key.toLowerCase().includes(keyword.toLowerCase()));
        console.log(`  Video Pool: Found ${matches.length} matches.`);
        if (matches.length > 0) {
            console.log(`  Example Keys:`);
            matches.slice(0, 5).forEach(m => console.log(`    - ${m.key}`));
        }
    }
}

findFolders('Made In Kenya');
findFolders('DaPhonk');
findFolders('Da Phonk');
