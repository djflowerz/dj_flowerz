const https = require('https');
const fs = require('fs');

const fetchURL = (url) => new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
    }).on('error', reject);
});

async function main() {
    console.log("Fetching remix worker...");
    const remixBody = await fetchURL('https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks');
    let remixes = [];
    try {
        remixes = JSON.parse(remixBody);
        console.log("Remixes count:", remixes.length);
    } catch (e) {
        console.error("Error parsing remixes JSON");
    }

    console.log("Fetching vicknick pool (HTML page with embedded JSON)...");
    const vicknickBody = await fetchURL('https://r2.vicknickvideopool.com/');
    let vicknick = [];

    const match = vicknickBody.match(/const\s+ALL_TRACKS\s*=\s*(\[[\s\S]*?\]);/m);
    if (match && match[1]) {
        try {
            vicknick = eval(match[1]);
            console.log("Vicknick count:", vicknick.length);
        } catch (e) {
            console.error("Error parsing vicknick embedded data:", e.message);
        }
    }

    // Combine all tracks
    let allTracks = [...remixes, ...vicknick];
    console.log(`Total tracks to process: ${allTracks.length}`);

    const allowedGenres = [
        "REMIXAH",
        "DANCEHALL REFIX",
        "Kenyan Love Songs (Low Hype)",
        "Kenyan Love Songs Hype",
        "Kikuyu Gospel (Kigocco)",
        "Bongo Flava (TBT) Hype",
        "Bongo TBT Low Hype",
        "Afrobeat (Oldies)",
        "Redrums Video Remixes",
        "Riddimz F'",
        "Afrohouse",
        "Reggae Fussion",
        "Amapiano",
        "Dancehall Edits",
        "Club Edits",
        "HYPE EDITS",
        "RnB Remixes",
        "Soul",
        "3 Step Amapiano",
        "South Africa Amapiano",
        "Reggae Covers",
        "Afro Beats (TBT)",
        "Mugithi Covers (Kikuyu)",
        "Taarabu",
        "Afro Amapiano"
    ];

    const yearRegex = /(202[0-6]) VIDEO POOL EDITS?/i;

    allTracks = allTracks.map(track => {
        // Title Replacement
        if (track.baseTitle) track.baseTitle = track.baseTitle.replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ');
        if (track.fileName) track.fileName = track.fileName.replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ');
        if (track.normalizedTitle) track.normalizedTitle = track.normalizedTitle.replace(/dj\s*vicknick/gi, 'dj flowerz');
        if (track.key) track.key = track.key.replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ');

        let rawGenre = (track.genre || track.month || "").trim();
        let rawYear = (track.year || "").trim();
        let key = track.key || "";

        rawGenre = rawGenre.replace(/R2 Pool/gi, '').replace(/Remix & Mashups new uploads/gi, '').trim();
        rawYear = rawYear.replace(/R2 Pool/gi, '').replace(/Remix & Mashups new uploads/gi, '').trim();

        let yearMatch = rawGenre.match(yearRegex) || rawYear.match(yearRegex) || key.match(yearRegex);
        if (yearMatch) {
            track.year = yearMatch[1];
            rawGenre = rawGenre.replace(yearRegex, '').trim();
        }

        let finalGenre = "REMIXAH"; // Default for hub
        let subGenre = "ROOT";

        if (key.toLowerCase().includes('riddim') || rawGenre.toLowerCase().includes('riddim')) {
            finalGenre = "Riddimz F'";
            if (rawGenre && !rawGenre.toLowerCase().includes('riddim')) {
                subGenre = rawGenre;
            } else if (key.includes('/')) {
                const parts = key.split('/');
                const riddimPart = parts.find(p => p.toLowerCase().includes('riddim'));
                if (riddimPart) subGenre = riddimPart;
                else subGenre = parts[parts.length - 2] || "General";
            }
        } else {
            const matched = allowedGenres.find(g => rawGenre.toLowerCase().includes(g.toLowerCase()) || (g.toLowerCase().includes(rawGenre.toLowerCase()) && rawGenre.length > 5));
            if (matched) {
                finalGenre = matched;
            } else {
                // Folder based classification
                if (key.includes('Redrums Video')) finalGenre = "Redrums Video Remixes";
                else if (key.includes('Amapiano')) finalGenre = "Amapiano";
                else if (key.includes('Reggae')) finalGenre = "Reggae Fussion";
                else if (key.includes('Bongo')) finalGenre = "Bongo Flava (TBT) Hype";
                else if (key.includes('Dancehall')) finalGenre = "Dancehall Edits";
                else if (key.includes('Remix & Mashups')) finalGenre = "REMIXAH";
                else if (rawGenre) {
                    // One last check on rawGenre contents
                    if (rawGenre.toLowerCase().includes('edit')) finalGenre = "Club Edits";
                    else if (rawGenre.toLowerCase().includes('hype')) finalGenre = "HYPE EDITS";
                    else finalGenre = "REMIXAH";
                }
            }
        }

        track.genre = finalGenre;
        track.subGenre = subGenre;
        track.artist = track.artist || "DJ FLOWERZ";

        return track;
    });

    // Grouping for report
    const grouped = {};
    allTracks.forEach(t => {
        const g = t.genre;
        const sf = t.subGenre;
        const y = t.year || "General";
        if (!grouped[g]) grouped[g] = {};
        if (!grouped[g][sf]) grouped[g][sf] = {};
        if (!grouped[g][sf][y]) grouped[g][sf][y] = 0;
        grouped[g][sf][y]++;
    });

    let output = "=== MUSIC POOL PROCESSING REPORT ===\n\n";
    for (const g in grouped) {
        output += `\n[GENRE: ${g}]\n`;
        for (const sf in grouped[g]) {
            if (sf !== "ROOT") output += `  > SUBFOLDER: ${sf}\n`;
            for (const y in grouped[g][sf]) {
                output += `    - YEAR: ${y} (${grouped[g][sf][y]} tracks)\n`;
            }
        }
    }

    fs.writeFileSync('processed_pool_tracks.txt', output);
    fs.writeFileSync('pool_tracks.json', JSON.stringify(allTracks, null, 2));
    console.log("Done. Saved pool_tracks.json and processed_pool_tracks.txt");
}

main().catch(console.error);
