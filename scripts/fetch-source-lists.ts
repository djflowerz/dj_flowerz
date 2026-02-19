
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const SOURCES = [
    'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks',
    'https://r2.vicknickvideopool.com/api/tracks'
];

async function fetchSource(url: string) {
    console.log(`📡 Fetching from: ${url}`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.log(`  ❌ HTTP ${res.status} for ${url}`);
            return null;
        }

        const data = await res.json();
        console.log(`  ✅ Received list with ${Array.isArray(data) ? data.length : 'unknown'} items`);
        return data;
    } catch (err: any) {
        console.log(`  ❌ Error fetching ${url}: ${err.message}`);
        return null;
    }
}

async function main() {
    for (const url of SOURCES) {
        const list = await fetchSource(url);
        if (list) {
            // Save for inspection if needed, or just process. 
            // For now, let's just see if we can get them.
        }
    }
}

main();
