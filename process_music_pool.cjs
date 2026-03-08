/**
 * process_music_pool.cjs — DJ Flowerz Music Pool Sifter
 *
 * Fetches raw track data from:
 *   1. Remix Hub Worker  (remix-and-mashups-worker.dennismacharia20.workers.dev)
 *   2. Vicknick Video Pool (r2.vicknickvideopool.com)
 *
 * Then runs each track through the "sifter" which extracts:
 *   - displayGenre   : clean, UI-facing genre label
 *   - collectionHub  : top-level hub (Remix Mashups, Riddimz, Hype Edits …)
 *   - releaseYear    : integer year (2020-2026) from URL/folder
 *   - releaseMonth   : month name from URL/folder
 *   - vibe           : 'Hype' | 'Low Hype' | 'Chill'
 *
 * Output: public/data/pool_tracks.json  +  processed_pool_tracks.txt (report)
 */

'use strict';

const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_REGEX = new RegExp(`(${MONTHS.join('|')})`, 'i');
const YEAR_REGEX = /\b(202[0-9])\b/;

/**
 * Hub definitions: each entry has an id, a label, and alias keywords used to
 * detect which hub a track belongs to based on the URL/folder path.
 */
const HUBS = [
    { id: 'remix_mashups', label: 'Remix & Mashups Hub', aliases: ['remix', 'mashup'] },
    { id: 'redrums', label: 'Redrums Video Remixes', aliases: ['redrum'] },
    { id: 'riddimz', label: "Riddimz F'", aliases: ['riddim'] },
    { id: 'hype_edits', label: 'Hype Edits', aliases: ['hype edit'] },
    { id: 'club_edits', label: 'Club Edits', aliases: ['club edit'] },
    { id: 'dancehall_edits', label: 'Dancehall Edits', aliases: ['dancehall edit', 'dancehall'] },
    { id: 'afrohouse', label: 'Afrohouse', aliases: ['afro house', 'afrohouse'] },
    { id: 'amapiano', label: 'Amapiano', aliases: ['amapiano'] },
    { id: '3step_amapiano', label: '3 Step Amapiano', aliases: ['3 step', '3step', '3-step'] },
    { id: 'sa_amapiano', label: 'South Africa Amapiano', aliases: ['south africa'] },
    { id: 'reggae_fusion', label: 'Reggae Fussion', aliases: ['reggae'] },
    { id: 'rnb', label: 'RnB Remixes', aliases: ['r&b', 'rnb'] },
    { id: 'bongo_tbt_hype', label: 'Bongo Flava (TBT) Hype', aliases: ['bongo flava', 'bongo tbt'] },
    { id: 'bongo_tbt_lowhype', label: 'Bongo TBT Low Hype', aliases: ['bongo tbt low'] },
    { id: 'afrobeat_oldies', label: 'Afrobeat (Oldies)', aliases: ['afrobeat', 'afro beat'] },
    { id: 'kl_hype', label: 'Kenyan Love Songs Hype', aliases: ['kenyan love', 'kenya love', 'african love'] },
    { id: 'kl_lowhype', label: 'Kenyan Love Songs (Low Hype)', aliases: ['kenyan love songs low', 'kenya love songs low'] },
    { id: 'kikuyu_gospel', label: 'Kikuyu Gospel (Kigocco)', aliases: ['kikuyu gospel', 'kigocco', 'mugithi'] },
    { id: 'dancehall_refix', label: 'DANCEHALL REFIX', aliases: ['dancehall refix'] },
    { id: 'soul', label: 'Soul', aliases: ['soul'] },
    { id: 'taarabu', label: 'Taarabu', aliases: ['taarabu'] },
    { id: 'afro_amapiano', label: 'Afro Amapiano', aliases: ['afro amapiano'] },
    { id: 'riddim_videos', label: 'Riddim Videos', aliases: ['riddim video'] },
    { id: 'pool_edits', label: 'Video Pool Edits', aliases: ['video pool edit', 'pool edit'] },
];

// Genre → Hub mapping for final display_genre assignment
const GENRE_DISPLAY_MAP = {
    'REMIXAH': { displayGenre: 'REMIXAH', hub: 'Remix & Mashups Hub', vibe: 'Hype' },
    'DANCEHALL REFIX': { displayGenre: 'Dancehall Refix', hub: 'Dancehall Edits', vibe: 'Hype' },
    'Kenyan Love Songs (Low Hype)': { displayGenre: 'Kenyan Love Songs', hub: 'Kenyan Love Songs (Low Hype)', vibe: 'Low Hype' },
    'Kenyan Love Songs Hype': { displayGenre: 'Kenyan Love Songs', hub: 'Kenyan Love Songs Hype', vibe: 'Hype' },
    'Kikuyu Gospel (Kigocco)': { displayGenre: 'Kikuyu Gospel (Kigocco)', hub: 'Kikuyu Gospel (Kigocco)', vibe: 'Hype' },
    'Bongo Flava (TBT) Hype': { displayGenre: 'Bongo Flava (TBT)', hub: 'Bongo Flava (TBT) Hype', vibe: 'Hype' },
    'Bongo TBT Low Hype': { displayGenre: 'Bongo Flava (TBT)', hub: 'Bongo TBT Low Hype', vibe: 'Low Hype' },
    'Afrobeat (Oldies)': { displayGenre: 'Afrobeat (Oldies)', hub: 'Afrobeat (Oldies)', vibe: 'Hype' },
    'Redrums Video Remixes': { displayGenre: 'Redrums Video Remixes', hub: 'Redrums Video Remixes', vibe: 'Hype' },
    "Riddimz F'": { displayGenre: "Riddimz F'", hub: "Riddimz F'", vibe: 'Hype' },
    'Riddim Videos': { displayGenre: 'Riddim Videos', hub: "Riddimz F'", vibe: 'Hype' },
    'Afrohouse': { displayGenre: 'Afrohouse', hub: 'Afrohouse', vibe: 'Hype' },
    'Reggae Fussion': { displayGenre: 'Reggae Fussion', hub: 'Reggae Fussion', vibe: 'Low Hype' },
    'Amapiano': { displayGenre: 'Amapiano', hub: 'Amapiano', vibe: 'Hype' },
    'Dancehall Edits': { displayGenre: 'Dancehall Edits', hub: 'Dancehall Edits', vibe: 'Hype' },
    'Club Edits': { displayGenre: 'Club Edits', hub: 'Club Edits', vibe: 'Hype' },
    'HYPE EDITS': { displayGenre: 'Hype Edits', hub: 'Hype Edits', vibe: 'Hype' },
    'RnB Remixes': { displayGenre: 'RnB Remixes', hub: 'RnB Remixes', vibe: 'Low Hype' },
    'Soul': { displayGenre: 'Soul', hub: 'Soul', vibe: 'Chill' },
    '3 Step Amapiano': { displayGenre: '3 Step Amapiano', hub: '3 Step Amapiano', vibe: 'Hype' },
    'South Africa Amapiano': { displayGenre: 'South Africa Amapiano', hub: 'South Africa Amapiano', vibe: 'Hype' },
    'Reggae Covers': { displayGenre: 'Reggae Covers', hub: 'Reggae Fussion', vibe: 'Low Hype' },
    'Afro Beats (TBT)': { displayGenre: 'Afro Beats (TBT)', hub: 'Afrobeat (Oldies)', vibe: 'Hype' },
    'Mugithi Covers (Kikuyu)': { displayGenre: 'Mugithi Covers (Kikuyu)', hub: 'Kikuyu Gospel (Kigocco)', vibe: 'Hype' },
    'Taarabu': { displayGenre: 'Taarabu', hub: 'Taarabu', vibe: 'Low Hype' },
    'Afro Amapiano': { displayGenre: 'Afro Amapiano', hub: 'Amapiano', vibe: 'Hype' },
};

// ─── Sifter Core Functions ────────────────────────────────────────────────────

/**
 * cleanTrackTitle(raw)
 * Removes DJ VICKNICK → DJ FLOWERZ, strips quality tags and trailing junk.
 */
function cleanTrackTitle(raw = '') {
    return raw
        .replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ')
        .replace(/\b(HD|SD|720p|1080p|4K)\b/gi, '')
        .replace(/\(\s*\)/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * extractYearAndMonth(str)
 * Tries to extract year and month from a URL path, folder name, or tag string.
 */
function extractYearAndMonth(str = '') {
    const decoded = decodeURIComponent(str);
    const yearMatch = decoded.match(YEAR_REGEX);
    const monthMatch = decoded.match(MONTH_REGEX);
    return {
        year: yearMatch ? parseInt(yearMatch[1]) : null,
        month: monthMatch ? monthMatch[1] : null,
    };
}

/**
 * detectHub(sources)
 * Scans an array of strings (genre, key/path, subGenre) and returns the
 * first matching HUBS entry.
 */
function detectHub(sources = []) {
    const combined = sources.join(' ').toLowerCase();
    for (const hub of HUBS) {
        if (hub.aliases.some(alias => combined.includes(alias))) return hub.label;
    }
    return 'Remix & Mashups Hub'; // safe default
}

/**
 * siftMusicPoolData(track)
 * The main sifter function. Takes a raw track object and returns a fully
 * populated track with all the new structured metadata fields.
 */
function siftMusicPoolData(track) {
    // ── 1. Clean all text fields ──────────────────────────────────────────────
    const cleanedTitle = cleanTrackTitle(track.baseTitle || track.fileName || track.title || '');
    const cleanedKey = cleanTrackTitle(track.key || '');

    // ── 2. Parse artist & title ───────────────────────────────────────────────
    let artist = 'DJ FLOWERZ';
    let title = cleanedTitle;

    const source = cleanedTitle || cleanTrackTitle(track.fileName || '').replace(/\.[^/.]+$/, '');
    if (source.includes(' - ')) {
        const parts = source.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
    }

    // ── 3. Extract year & month from key/path and genre ──────────────────────
    const fromKey = extractYearAndMonth(cleanedKey);
    const fromGenre = extractYearAndMonth(track.genre || track.month || '');
    const fromYear = extractYearAndMonth(track.year || '');

    const releaseYear = fromKey.year || fromGenre.year || fromYear.year || null;
    const releaseMonth = fromKey.month || fromGenre.month || fromYear.month || null;

    // ── 4. Genre classification ───────────────────────────────────────────────
    let rawGenre = (track.genre || track.month || '').trim();
    rawGenre = rawGenre.replace(/R2 Pool/gi, '').replace(/Remix & Mashups new uploads/gi, '').trim();
    const lowerRaw = rawGenre.toLowerCase();

    let finalGenre = 'REMIXAH'; // fallback

    if (lowerRaw.includes('afro house') || lowerRaw.includes('afrohouse')) finalGenre = 'Afrohouse';
    else if (lowerRaw.includes('r&b') || lowerRaw.includes('rnb')) finalGenre = 'RnB Remixes';
    else if ((lowerRaw.includes('kenya love') || lowerRaw.includes('kenyan love')) && lowerRaw.includes('low')) finalGenre = 'Kenyan Love Songs (Low Hype)';
    else if ((lowerRaw.includes('kenya love') || lowerRaw.includes('kenyan love')) && lowerRaw.includes('hype')) finalGenre = 'Kenyan Love Songs Hype';
    else if (lowerRaw.includes('kenya love') || lowerRaw.includes('kenyan love')) finalGenre = 'Kenyan Love Songs (Low Hype)';
    else if (lowerRaw.includes('bongo tbt') && lowerRaw.includes('low')) finalGenre = 'Bongo TBT Low Hype';
    else if (lowerRaw.includes('bongo tbt') || lowerRaw.includes('bongo flava (tbt)')) finalGenre = 'Bongo Flava (TBT) Hype';
    else if (lowerRaw.includes('afrobeat (oldies)') || lowerRaw.includes('afrobeat oldies')) finalGenre = 'Afrobeat (Oldies)';
    else if (lowerRaw.includes('kikuyu gospel') || lowerRaw.includes('kigocco')) finalGenre = 'Kikuyu Gospel (Kigocco)';
    else if (lowerRaw.includes('3 step') || lowerRaw.includes('3step') || lowerRaw.includes('3-step')) finalGenre = '3 Step Amapiano';
    else if (lowerRaw.includes('south africa') && lowerRaw.includes('amapiano')) finalGenre = 'South Africa Amapiano';
    else if (lowerRaw.includes('afro amapiano')) finalGenre = 'Afro Amapiano';
    else if (lowerRaw.includes('riddim video')) finalGenre = 'Riddim Videos';
    else if (lowerRaw.includes('soul')) finalGenre = 'Soul';
    else if (lowerRaw.includes('taarabu')) finalGenre = 'Taarabu';
    else if (lowerRaw.includes('mugithi')) finalGenre = 'Mugithi Covers (Kikuyu)';
    else if (lowerRaw.includes('reggae cover')) finalGenre = 'Reggae Covers';
    else if (lowerRaw.includes('dancehall refix')) finalGenre = 'DANCEHALL REFIX';
    else if (lowerRaw.includes('redrum')) finalGenre = 'Redrums Video Remixes';
    else {
        // Keyword fallback via key/path
        const keyLower = cleanedKey.toLowerCase();
        if (keyLower.includes('riddim') || lowerRaw.includes('riddim')) finalGenre = "Riddimz F'";
        else if (keyLower.includes('redrum')) finalGenre = 'Redrums Video Remixes';
        else if (keyLower.includes('amapiano')) finalGenre = 'Amapiano';
        else if (keyLower.includes('reggae')) finalGenre = 'Reggae Fussion';
        else if (keyLower.includes('bongo')) finalGenre = 'Bongo Flava (TBT) Hype';
        else if (keyLower.includes('dancehall')) finalGenre = 'Dancehall Edits';
        else if (keyLower.includes('remix') || keyLower.includes('mashup')) finalGenre = 'REMIXAH';
        else if (lowerRaw.includes('club edit')) finalGenre = 'Club Edits';
        else if (lowerRaw.includes('hype edit')) finalGenre = 'HYPE EDITS';
        else finalGenre = 'REMIXAH';
    }

    // ── 5. Derive displayGenre, collectionHub, vibe from the genre map ────────
    const mapped = GENRE_DISPLAY_MAP[finalGenre] || {
        displayGenre: finalGenre,
        hub: detectHub([rawGenre, cleanedKey]),
        vibe: 'Hype',
    };

    // Override hub if it's a year-based pool edit
    let collectionHub = mapped.hub;
    if (releaseYear && cleanedKey.toLowerCase().includes('pool')) {
        collectionHub = `${releaseYear} VIDEO POOL EDITS`;
    }

    // ── 6. Sub-genre (for Riddimz — the specific Riddim folder name) ──────────
    let subGenre = track.subGenre || null;
    if (finalGenre === "Riddimz F'" && !subGenre && cleanedKey.includes('/')) {
        const parts = cleanedKey.split('/');
        const riddimPart = parts.find(p => p.toLowerCase().includes('riddim'));
        subGenre = riddimPart || parts[parts.length - 2] || null;
    }

    // ── 7. Build download URL ─────────────────────────────────────────────────
    const downloadUrl = (track.id && track.id.startsWith('http'))
        ? track.id
        : `https://r2.vicknickvideopool.com/${track.key || track.fileName || ''}`;

    // ── 8. Assemble versions ──────────────────────────────────────────────────
    const versionType = track.version || (track.type === 'video' ? 'Video' : 'Audio');
    const versions = track.versions && track.versions.length > 0
        ? track.versions
        : [{ id: 'v1', type: versionType, downloadUrl }];

    // ── 9. Build category tags ────────────────────────────────────────────────
    const category = [
        rawGenre, finalGenre, mapped.displayGenre,
        releaseYear ? `${releaseYear} VIDEO POOL EDITS` : null,
        releaseMonth,
        collectionHub,
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // unique

    return {
        id: track.key || track.fileName || Math.random().toString(36).substr(2, 9),
        artist,
        title,
        genre: finalGenre,
        displayGenre: mapped.displayGenre,
        collectionHub,
        subGenre,
        vibe: mapped.vibe,
        releaseYear,
        releaseMonth,
        category,
        versions,
        previewUrl: downloadUrl,
        downloadUrl,
        linkStatus: 'unchecked',
        bpm: track.bpm || 0,
        dateAdded: track.uploaded || track.dateAdded || new Date().toISOString(),
    };
}

// ─── Fetch Helpers ─────────────────────────────────────────────────────────────

async function main() {
    const remixFile = 'remix_hub_raw.json';
    const vicknickFile = 'vicknick_raw.html';

    // 1. Fetch Remix Hub
    console.log('📡 Fetching Remix Hub data…');
    try {
        execSync(
            `curl -s -L -H "User-Agent: Mozilla/5.0" --connect-timeout 30 --max-time 300 ` +
            `https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks -o ${remixFile}`
        );
        console.log('✅ Remix Hub fetched');
    } catch (e) {
        console.error('❌ Error fetching remix hub:', e.message);
    }

    let remixes = [];
    if (fs.existsSync(remixFile)) {
        try {
            remixes = JSON.parse(fs.readFileSync(remixFile, 'utf8'));
            console.log(`   → ${remixes.length} remixes loaded`);
        } catch (e) {
            console.error('❌ Error parsing remix_hub_raw.json:', e.message);
        }
    }

    // 2. Fetch Vicknick Pool
    console.log('📡 Fetching Vicknick Video Pool…');
    try {
        execSync(
            `curl -s -L -H "User-Agent: Mozilla/5.0" --connect-timeout 30 --max-time 300 ` +
            `https://r2.vicknickvideopool.com/ -o ${vicknickFile}`
        );
        console.log('✅ Vicknick Pool fetched');
    } catch (e) {
        console.error('❌ Error fetching vicknick pool:', e.message);
    }

    let vicknick = [];
    if (fs.existsSync(vicknickFile)) {
        const body = fs.readFileSync(vicknickFile, 'utf8');
        const match = body.match(/const\s+ALL_TRACKS\s*=\s*(\[[\s\S]*?\]);/m);
        if (match && match[1]) {
            try {
                vicknick = eval(match[1]); // eslint-disable-line no-eval
                console.log(`   → ${vicknick.length} Vicknick tracks loaded`);
            } catch (e) {
                console.error('❌ Error parsing Vicknick embedded data:', e.message);
            }
        }
    }

    // 3. Combine + sift
    const raw = [...remixes, ...vicknick];
    console.log(`\n🔍 Sifting ${raw.length} total tracks…`);
    const allTracks = raw.map(siftMusicPoolData);
    console.log(`✅ ${allTracks.length} tracks processed`);

    // 4. Report
    const grouped = {};
    allTracks.forEach(t => {
        const hub = t.collectionHub || 'Unknown Hub';
        const disp = t.displayGenre || 'Unknown Genre';
        const yr = t.releaseYear || 'General';
        if (!grouped[hub]) grouped[hub] = {};
        if (!grouped[hub][disp]) grouped[hub][disp] = {};
        if (!grouped[hub][disp][yr]) grouped[hub][disp][yr] = 0;
        grouped[hub][disp][yr]++;
    });

    let report = `=== MUSIC POOL SIFTER REPORT (${new Date().toISOString()}) ===\n\n`;
    for (const hub in grouped) {
        report += `\n[HUB: ${hub}]\n`;
        for (const genre in grouped[hub]) {
            report += `  ▶ ${genre}\n`;
            for (const yr in grouped[hub][genre]) {
                report += `      ${yr}: ${grouped[hub][genre][yr]} tracks\n`;
            }
        }
    }
    report += `\nTOTAL: ${allTracks.length} tracks\n`;

    // 5. Write outputs
    const dataDir = 'public/data';
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync('processed_pool_tracks.txt', report);
    fs.writeFileSync(`${dataDir}/pool_tracks.json`, JSON.stringify(allTracks, null, 2));

    console.log(`\n📊 Report:\n${report}`);
    console.log(`\n💾 Saved to ${dataDir}/pool_tracks.json`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
