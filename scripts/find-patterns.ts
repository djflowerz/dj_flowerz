
import fs from 'fs';
import fetch from 'node-fetch';

const BASES = [
    'https://cdn.vicknickvideopool.com',
    'https://r2.vicknickvideopool.com',
    'https://remix-and-mashups.vicknickvideopool.com' // Just a guess
];

async function checkUrl(url: string) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.status === 200 && !res.headers.get('content-type')?.includes('html');
    } catch {
        return false;
    }
}

async function run() {
    const lines = fs.readFileSync('scanned_files.txt', 'utf8').split('\n');
    console.log(`Checking ${lines.length} lines from scanned_files.txt...`);

    let found = 0;
    for (const line of lines.slice(0, 1000)) { // Check first 1000
        const path = line.trim();
        if (!path) continue;

        for (const base of BASES) {
            // Try 1: Full path
            const url1 = `${base}/${path.split('/').map(encodeURIComponent).join('/')}`;
            if (await checkUrl(url1)) {
                console.log(`✅ FOUND: ${url1}`);
                found++;
                if (found > 5) return;
            }

            // Try 2: Just filename at root
            const filename = path.split('/').pop();
            if (filename) {
                const url2 = `${base}/${encodeURIComponent(filename)}`;
                if (await checkUrl(url2)) {
                    console.log(`✅ FOUND: ${url2}`);
                    found++;
                    if (found > 5) return;
                }
            }
        }
    }
    console.log('Finished search.');
}

run();
