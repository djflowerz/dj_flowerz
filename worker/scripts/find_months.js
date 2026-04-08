import fs from 'fs';
import readline from 'readline';
import path from 'path';

async function findMonths(filename) {
    const fileStream = fs.createReadStream(filename);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const months = new Set();
    for await (const line of rl) {
        if (line.includes('"key":')) {
            if (line.toLowerCase().includes('april') || line.toLowerCase().includes('january')) {
                const match = line.match(/"key":\s*"(.*)"/);
                if (match) {
                    const parts = match[1].split('/');
                    if (parts.length > 1) {
                        months.add(parts.slice(0, -1).join(' / '));
                    }
                }
            }
        }
    }
    return Array.from(months);
}

const remixFile = 'remix_mashups.json';
const vicknickFile = 'vicknick_tracks.json';

Promise.all([findMonths(remixFile), findMonths(vicknickFile)]).then(([remixResults, vicknickResults]) => {
    console.log('--- Remix Hub ---');
    remixResults.forEach(r => console.log(r));
    console.log('\n--- Video Pool ---');
    vicknickResults.forEach(v => console.log(v));
}).catch(err => console.error(err));
