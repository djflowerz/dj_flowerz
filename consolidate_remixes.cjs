const fs = require('fs');

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_REGEX = new RegExp(`(${MONTHS.join('|')})`, 'i');
const YEAR_REGEX = /\b(202[0-9])\b/;

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

function cleanTrackTitle(raw = '') {
    return raw
        .replace(/DJ\s*VICKNICK/gi, 'DJ FLOWERZ')
        .replace(/\b(HD|SD|720p|1080p|4K)\b/gi, '')
        .replace(/\(\s*\)/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function extractYearAndMonth(str = '') {
    let decoded = str;
    try {
        decoded = decodeURIComponent(str);
    } catch (e) {}
    const yearMatch = decoded.match(YEAR_REGEX);
    const monthMatch = decoded.match(MONTH_REGEX);
    return {
        year: yearMatch ? parseInt(yearMatch[1]) : null,
        month: monthMatch ? monthMatch[1] : null,
    };
}

function detectHub(sources = []) {
    const combined = sources.join(' ').toLowerCase();
    for (const hub of HUBS) {
        if (hub.aliases.some(alias => combined.includes(alias))) return hub.label;
    }
    return 'Remix & Mashups Hub';
}

function siftMusicPoolData(track) {
    const cleanedTitle = cleanTrackTitle(track.baseTitle || track.fileName || track.title || '');
    const cleanedKey = cleanTrackTitle(track.key || '');

    let artist = 'DJ FLOWERZ';
    let title = cleanedTitle;

    const source = cleanedTitle || cleanTrackTitle(track.fileName || '').replace(/\.[^/.]+$/, '');
    if (source.includes(' - ')) {
        const parts = source.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
    }

    const fromKey = extractYearAndMonth(cleanedKey);
    const fromGenre = extractYearAndMonth(track.genre || track.month || '');
    const fromYear = extractYearAndMonth(track.year || '');

    const releaseYear = fromKey.year || fromGenre.year || fromYear.year || null;
    const releaseMonth = fromKey.month || fromGenre.month || fromYear.month || null;

    let rawGenre = (track.genre || track.month || '').trim();
    rawGenre = rawGenre.replace(/R2 Pool/gi, '').replace(/Remix & Mashups new uploads/gi, '').trim();
    const lowerRaw = rawGenre.toLowerCase();

    let finalGenre = 'REMIXAH';

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

    const mapped = GENRE_DISPLAY_MAP[finalGenre] || {
        displayGenre: finalGenre,
        hub: detectHub([rawGenre, cleanedKey]),
        vibe: 'Hype',
    };

    let collectionHub = mapped.hub;
    if (releaseYear && cleanedKey.toLowerCase().includes('pool')) {
        collectionHub = `${releaseYear} VIDEO POOL EDITS`;
    }

    let subGenre = track.subGenre || null;
    if (finalGenre === "Riddimz F'" && !subGenre && cleanedKey.includes('/')) {
        const parts = cleanedKey.split('/');
        const riddimPart = parts.find(p => p.toLowerCase().includes('riddim'));
        subGenre = riddimPart || parts[parts.length - 2] || null;
    }

    const downloadUrl = (track.id && track.id.startsWith('http'))
        ? track.id
        : (track.downloadLink ? track.downloadLink : `https://r2.vicknickvideopool.com/${track.key || track.fileName || ''}`);

    const versionType = track.version || (track.type === 'video' ? 'Video' : 'Audio');
    const versions = track.versions && track.versions.length > 0
        ? track.versions
        : [{ id: 'v1', type: versionType, downloadUrl }];

    const category = [
        rawGenre, finalGenre, mapped.displayGenre,
        releaseYear ? `${releaseYear} VIDEO POOL EDITS` : null,
        releaseMonth,
        collectionHub,
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

    let key = track.key || track.fileName || ('Remix & Mashups Hub/' + (track.genre || '') + '/' + track.title + '.mp4');
    if (track.downloadLink) {
        try {
            key = decodeURIComponent(track.downloadLink.replace('https://cdn.vicknickvideopool.com/', ''));
        } catch (e) {}
    }

    return {
        id: key,
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
        previewUrl: track.previewLink || downloadUrl,
        downloadUrl,
        linkStatus: track.linkStatus || 'unchecked',
        bpm: track.bpm || 0,
        dateAdded: track.uploaded || track.dateAdded || new Date().toISOString(),
    };
}

function main() {
    let pool = [];
    if (fs.existsSync('pool_tracks.json')) {
        pool = JSON.parse(fs.readFileSync('pool_tracks.json'));
        console.log(`Loaded ${pool.length} tracks from pool_tracks.json`);
    }

    const poolMap = new Map();
    pool.forEach(t => poolMap.set(t.id, t));

    let hubRaw = [];
    if (fs.existsSync('remix_hub_raw.json')) {
        hubRaw = JSON.parse(fs.readFileSync('remix_hub_raw.json'));
        console.log(`Loaded ${hubRaw.length} tracks from remix_hub_raw.json`);
    }

    let tracksData = [];
    if (fs.existsSync('remix_tracks_data.json')) {
        tracksData = JSON.parse(fs.readFileSync('remix_tracks_data.json'));
        console.log(`Loaded ${tracksData.length} tracks from remix_tracks_data.json`);
    }

    let addedFromHub = 0;
    hubRaw.forEach(t => {
        const sifted = siftMusicPoolData(t);
        if (!poolMap.has(sifted.id)) {
            poolMap.set(sifted.id, sifted);
            addedFromHub++;
        }
    });

    let addedFromTracksData = 0;
    tracksData.forEach(t => {
        // Need to construct a pseudo-raw track for sifter
        const rawTrack = {
            title: t.title,
            genre: t.genre,
            downloadLink: t.downloadLink,
            previewLink: t.previewLink
        };
        const sifted = siftMusicPoolData(rawTrack);
        if (!poolMap.has(sifted.id)) {
            poolMap.set(sifted.id, sifted);
            addedFromTracksData++;
        }
    });

    const finalPool = Array.from(poolMap.values());
    console.log(`Added ${addedFromHub} from remix_hub_raw.json`);
    console.log(`Added ${addedFromTracksData} from remix_tracks_data.json`);
    console.log(`Total tracks in pool: ${finalPool.length}`);

    fs.writeFileSync('pool_tracks_consolidated.json', JSON.stringify(finalPool, null, 2));
    console.log('Saved to pool_tracks_consolidated.json');
}

main();
