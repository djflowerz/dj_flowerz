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
        // Title Replacement for VICKNICK
        if (track.baseTitle) track.baseTitle = track.baseTitle.replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ');
        if (track.fileName) track.fileName = track.fileName.replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ');
        if (track.normalizedTitle) track.normalizedTitle = track.normalizedTitle.replace(/dj\s*vicknick/gi, 'dj flowerz');
        if (track.key) track.key = track.key.replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ');

        // Robust Artist & Title Parsing from baseTitle
        let artist = "DJ FLOWERZ";
        let title = track.baseTitle || track.fileName || "Untitled Mix";

        if (track.baseTitle && track.baseTitle.includes(" - ")) {
            const parts = track.baseTitle.split(" - ");
            artist = parts[0].trim();
            title = parts.slice(1).join(" - ").trim();
        } else if (track.fileName && track.fileName.includes(" - ")) {
            const cleanFileName = track.fileName.replace(/\.[^/.]+$/, "").replace(/\(HD\)|\(SD\)/gi, "").trim();
            const parts = cleanFileName.split(" - ");
            artist = parts[0].trim();
            title = parts.slice(1).join(" - ").trim();
        }

        // Specific Year & Month handling
        let rawGenre = (track.genre || track.month || "").trim();
        let rawYearStr = (track.year || "").trim();
        let key = track.key || "";

        rawGenre = rawGenre.replace(/R2 Pool/gi, '').replace(/Remix & Mashups new uploads/gi, '').trim();
        rawYearStr = rawYearStr.replace(/R2 Pool/gi, '').replace(/Remix & Mashups new uploads/gi, '').trim();

        let yearMatch = rawGenre.match(yearRegex) || rawYearStr.match(yearRegex) || key.match(yearRegex);
        let finalYear = rawYearStr;
        if (yearMatch) {
            finalYear = yearMatch[1];
            rawGenre = rawGenre.replace(yearRegex, '').trim();
        } else if (key.includes("2026 VIDEO POOL EDITS")) {
            finalYear = "2026";
        }

        // Genre Classification
        let finalGenre = "REMIXAH";
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
                if (key.includes('Redrums Video')) finalGenre = "Redrums Video Remixes";
                else if (key.includes('Amapiano')) finalGenre = "Amapiano";
                else if (key.includes('Reggae')) finalGenre = "Reggae Fussion";
                else if (key.includes('Bongo')) finalGenre = "Bongo Flava (TBT) Hype";
                else if (key.includes('Dancehall')) finalGenre = "Dancehall Edits";
                else if (key.includes('Remix & Mashups')) finalGenre = "REMIXAH";
                else if (rawGenre) {
                    if (rawGenre.toLowerCase().includes('edit')) finalGenre = "Club Edits";
                    else if (rawGenre.toLowerCase().includes('hype')) finalGenre = "HYPE EDITS";
                    else finalGenre = "REMIXAH";
                }
            }
        }

        // Frontend Compatibility (DataContext.tsx mapping)
        const downloadUrl = (track.id && track.id.startsWith("http")) ? track.id : `https://r2.vicknickvideopool.com/${track.key || track.fileName}`;

        return {
            ...track,
            id: track.key || track.fileName || Math.random().toString(36).substr(2, 9),
            title: title,
            artist: artist,
            genre: finalGenre,
            subGenre: subGenre,
            year: finalYear,
            category: [rawGenre, finalGenre, `${finalYear} VIDEO POOL EDITS`].filter(Boolean),
            versions: [
                {
                    id: "v1",
                    type: track.version || (track.type === "video" ? "Video" : "Audio"),
                    downloadUrl: downloadUrl
                }
            ],
            previewUrl: downloadUrl,
            dateAdded: track.uploaded || new Date().toISOString()
        };
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
