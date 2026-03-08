
import fs from 'fs';
import path from 'path';
import https from 'https';

const mixtapesPath = path.join(process.cwd(), 'public/data/mixtapes.json');

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function restoreCovers() {
    const mixtapes = JSON.parse(fs.readFileSync(mixtapesPath, 'utf8'));
    let updatedCount = 0;

    for (let m of mixtapes) {
        // Check if it's a hearthis.at link AND (no cover_url OR cover_url is empty OR cover_url is data URI)
        const isHearthisAt = m.audio_url && m.audio_url.includes('hearthis.at');
        const missingCover = !m.cover_url || m.cover_url === '' || m.cover_url.startsWith('data:');

        if (isHearthisAt && missingCover) {
            console.log(`Fetching cover for: ${m.title}...`);
            try {
                const oembedUrl = `https://hearthis.at/oembed/?url=${encodeURIComponent(m.audio_url)}&format=json`;
                const data = await fetchJson(oembedUrl);
                if (data.thumbnail_url) {
                    m.cover_url = data.thumbnail_url;
                    updatedCount++;
                    console.log(`✅ Found: ${m.cover_url}`);
                }
            } catch (err) {
                console.error(`❌ Failed to fetch for ${m.title}:`, err.message);
            }
            // Add a small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (updatedCount > 0) {
        fs.writeFileSync(mixtapesPath, JSON.stringify(mixtapes, null, 2));
        console.log(`\nDONE: Updated ${updatedCount} mixtapes with cover URLs.`);
    } else {
        console.log('\nNo missing covers found for hearthis.at links.');
    }
}

restoreCovers();
