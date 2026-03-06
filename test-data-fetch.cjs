const https = require('https');

const fetchJSON = (url) => new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                console.error("Failed to parse", url, body.substring(0, 100));
                resolve([]);
            }
        });
    }).on('error', reject);
});

async function main() {
    console.log("Fetching remix worker...");
    const remixes = await fetchJSON('https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks');
    console.log("Remixes count:", remixes.length);
    if (remixes.length > 0) console.log("Sample:", JSON.stringify(remixes[0], null, 2));

    console.log("\nFetching vicknick pool...");
    const vi_pool = await fetchJSON('https://r2.vicknickvideopool.com/api/tracks');
    console.log("Vicknick pool count:", vi_pool.length);
    if (vi_pool.length > 0) console.log("Sample:", JSON.stringify(vi_pool[0], null, 2));
}

main().catch(console.error);
