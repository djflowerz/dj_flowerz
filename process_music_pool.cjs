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
    const remixFile = 'remix_hub_raw.json';
    const vicknickFile = 'vicknick_raw.html';

    // 1. Fetch Remix Hub
    console.log("Fetching remix worker data...");
    try {
        require('child_process').execSync(`curl -s -L -H "User-Agent: Mozilla/5.0" --connect-timeout 10 --max-time 120 https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks -o ${remixFile}`);
    } catch (e) {
        console.error("Error fetching remix hub:", e.message);
    }

    let remixes = [];
    if (fs.existsSync(remixFile)) {
        try {
            remixes = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
            console.log("Remixes count:", remixes.length);
        } catch (e) {
            console.error("Error parsing remix_hub_raw.json");
        }
    }

    // 2. Fetch Vicknick Pool
    console.log("Fetching vicknick pool data...");
    try {
        require('child_process').execSync(`curl -s -L -H "User-Agent: Mozilla/5.0" --connect-timeout 10 --max-time 120 https://r2.vicknickvideopool.com/ -o ${vicknickFile}`);
    } catch (e) {
        console.error("Error fetching vicknick pool:", e.message);
    }

    let vicknick = [];
    if (fs.existsSync(vicknickFile)) {
        const vicknickBody = fs.readFileSync(vicknickFile, 'utf8');
        const match = vicknickBody.match(/const\s+ALL_TRACKS\s*=\s*(\[[\s\S]*?\]);/m);
        if (match && match[1]) {
            try {
                vicknick = eval(match[1]);
                console.log("Vicknick count:", vicknick.length);
            } catch (e) {
                console.error("Error parsing vicknick embedded data:", e.message);
            }
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
        "Riddim Videos",
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

        // 1. Alias Mapping Overrides
        const lowerRaw = rawGenre.toLowerCase();

        if (lowerRaw.includes('afro house')) finalGenre = "Afrohouse";
        else if (lowerRaw.includes('r&b') || lowerRaw.includes('rnb')) finalGenre = "RnB Remixes";
        else if (lowerRaw.includes('kenya love songs') || lowerRaw.includes('kenyan love songs')) {
            if (lowerRaw.includes('low hype')) finalGenre = "Kenyan Love Songs (Low Hype)";
            else if (lowerRaw.includes('hype')) finalGenre = "Kenyan Love Songs Hype";
            else finalGenre = "Kenyan Love Songs (Low Hype)";
        }
        else if (lowerRaw.includes('bongo tbt') || lowerRaw.includes('bongo flava (tbt)')) {
            if (lowerRaw.includes('low hype')) finalGenre = "Bongo TBT Low Hype";
            else finalGenre = "Bongo Flava (TBT) Hype";
        }
        else if (lowerRaw.includes('afrobeat (oldies)') || lowerRaw.includes('afrobeat oldies')) {
            finalGenre = "Afrobeat (Oldies)";
        }
        else if (lowerRaw.includes('kikuyu gospel') || lowerRaw.includes('kigocco')) finalGenre = "Kikuyu Gospel (Kigocco)";
        else if (lowerRaw.includes('3 step') || lowerRaw.includes('3-step')) finalGenre = "3 Step Amapiano";
        else if (lowerRaw.includes('south africa') && lowerRaw.includes('amapiano')) finalGenre = "South Africa Amapiano";
        else {
            // 2. Strict Match from allowed list
            const matched = allowedGenres.find(g => lowerRaw.includes(g.toLowerCase()) || (g.toLowerCase().includes(lowerRaw) && rawGenre.length > 5));
            if (matched) {
                finalGenre = matched;
            }
            // 3. Riddim Catch-all (Special Priority)
            else if (key.toLowerCase().includes('riddim') || lowerRaw.includes('riddim')) {
                finalGenre = "Riddimz F'";
                if (rawGenre && !lowerRaw.includes('riddim')) {
                    subGenre = rawGenre;
                } else if (key.includes('/')) {
                    const parts = key.split('/');
                    const riddimPart = parts.find(p => p.toLowerCase().includes('riddim'));
                    if (riddimPart) subGenre = riddimPart;
                    else subGenre = parts[parts.length - 2] || "General";
                }
            }
            // 4. Folder/Keyword Path Matching
            else {
                if (key.includes('Redrums Video')) finalGenre = "Redrums Video Remixes";
                else if (key.includes('Amapiano')) finalGenre = "Amapiano";
                else if (key.includes('Reggae')) finalGenre = "Reggae Fussion";
                else if (key.includes('Bongo')) finalGenre = "Bongo Flava (TBT) Hype";
                else if (key.includes('Dancehall')) finalGenre = "Dancehall Edits";
                else if (key.includes('Remix & Mashups')) finalGenre = "REMIXAH";
                else if (rawGenre) {
                    if (lowerRaw.includes('edit')) finalGenre = "Club Edits";
                    else if (lowerRaw.includes('hype')) finalGenre = "HYPE EDITS";
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
