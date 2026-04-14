const fs = require('fs');

function esc(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "''");
}

function normalizeUrlPath(urlStr) {
    if (!urlStr) return "";
    try {
        const urlParts = urlStr.split('?')[0]; 
        let path = urlParts.toLowerCase().trim();
        path = path.replace(/[\s\-_]\(\d+\)(\.[a-z0-9]+)$/i, '$1');
        path = path.replace(/[\s\-_]\d+(\.[a-z0-9]+)$/i, '$1');
        return path;
    } catch (e) { return urlStr.toLowerCase().trim(); }
}

function cleanMetadata(text) {
    if (!text) return "";
    let cleaned = text.replace(/dj\s*vick\s*nick/gi, 'DJ Flowerz');
    cleaned = cleaned.replace(/\s\(\d+\)$/g, ''); 
    cleaned = cleaned.replace(/[\s\-_]\d+$/g, '');
    return cleaned.trim();
}

function extractVersionInfo(title) {
    const baseTitle = cleanMetadata(title || "");
    const tags = [/\((remix|rmx)\)/i, /\((intro|int)\)/i, /\((edit|short edit)\)/i, /\((clean|tv clean)\)/i, /\((dirty|explicit)\)/i, /\((instrumental|inst)\)/i, /\((acapella|acap)\)/i, /\((extended|extendz)\)/i];
    let normalizedBase = baseTitle;
    for (const tag of tags) normalizedBase = normalizedBase.replace(tag, '').trim();
    normalizedBase = normalizedBase.replace(/[-_]$/, '').trim();
    return { normalizedBase };
}

function getSongFingerprint(artist, title) {
    const { normalizedBase } = extractVersionInfo(title);
    const cleanArt = cleanMetadata(artist);
    return `${cleanArt.toLowerCase()}_${normalizedBase.toLowerCase()}`.replace(/[^a-z0-9]/g, '_');
}

async function run() {
    try {
        console.log("Loading data...");
        const tracksRaw = JSON.parse(fs.readFileSync('tracks_raw.json', 'utf8'))[0].results;
        const versionsRaw = JSON.parse(fs.readFileSync('versions_raw.json', 'utf8'))[0].results;

        console.log(`Analyzing ${tracksRaw.length} tracks and ${versionsRaw.length} versions...`);

        const reparentQueries = [];
        const deleteVersionQueries = [];
        const deleteTrackQueries = [];
        const updateQueries = [];
        
        const stats = { versionsDeleted: 0, versionsUpdated: 0, tracksDeleted: 0, versionsReparented: 0 };

        // 1. DEDUPLICATE URL CLONES
        const urlMap = new Map();
        const redundantVersionIds = new Set();
        for (const v of versionsRaw) {
            const url = v.download_url || v.file_url || v.preview_url;
            if (!url) continue;
            const fp = normalizeUrlPath(url);
            if (urlMap.has(fp)) {
                redundantVersionIds.add(v.id);
                stats.versionsDeleted++;
            } else {
                urlMap.set(fp, v);
            }
        }

        redundantVersionIds.forEach(id => {
            deleteVersionQueries.push(`DELETE FROM track_versions WHERE id = '${esc(id)}';`);
        });

        const remainingVersions = versionsRaw.filter(v => !redundantVersionIds.has(v.id));
        
        const versionsByTrackId = new Map();
        for (const v of remainingVersions) {
            const list = versionsByTrackId.get(v.track_id) || [];
            list.push(v);
            versionsByTrackId.set(v.track_id, list);
        }

        // 2. CONSOLIDATE TRACK CARDS
        const trackMap = new Map(); 
        for (const t of tracksRaw) {
            const fp = getSongFingerprint(t.artist, t.title);
            if (trackMap.has(fp)) {
                const master = trackMap.get(fp);
                
                const orphaned = versionsByTrackId.get(t.id) || [];
                orphaned.forEach(ov => {
                    reparentQueries.push(`UPDATE track_versions SET track_id = '${esc(master.id)}' WHERE id = '${esc(ov.id)}';`);
                    ov.track_id = master.id; 
                    if (!versionsByTrackId.has(master.id)) versionsByTrackId.set(master.id, []);
                    versionsByTrackId.get(master.id).push(ov);
                    stats.versionsReparented++;
                });
                versionsByTrackId.delete(t.id);

                try {
                    const mCats = JSON.parse(master.category || '[]');
                    const tCats = JSON.parse(t.category || '[]');
                    const combined = [...new Set([...(Array.isArray(mCats) ? mCats : []), ...(Array.isArray(tCats) ? tCats : [])])];
                    const catString = JSON.stringify(combined);
                    if (catString !== master.category) {
                        master.category = catString;
                        updateQueries.push(`UPDATE tracks SET category = '${esc(master.category)}' WHERE id = '${esc(master.id)}';`);
                    }
                } catch(e) {}

                deleteTrackQueries.push(`DELETE FROM tracks WHERE id = '${esc(t.id)}';`);
                stats.tracksDeleted++;
            } else {
                trackMap.set(fp, t);
                const cleanArt = cleanMetadata(t.artist);
                const cleanTtl = cleanMetadata(t.title);
                if (cleanArt !== t.artist || cleanTtl !== t.title) {
                    updateQueries.push(`UPDATE tracks SET artist = '${esc(cleanArt)}', title = '${esc(cleanTtl)}' WHERE id = '${esc(t.id)}';`);
                }
            }
        }

        // 3. AUDIO/VIDEO LABELING
        for (const [trackId, versions] of versionsByTrackId.entries()) {
            const nameToVersions = new Map(); 
            versions.forEach(v => {
                const cleanVName = (v.version_name || 'Main').replace(/\((Audio|Video)\)$/i, '').trim();
                const list = nameToVersions.get(cleanVName) || [];
                list.push(v);
                nameToVersions.set(cleanVName, list);
            });

            for (const [vName, vList] of nameToVersions.entries()) {
                if (vList.length > 1) {
                    vList.forEach(v => {
                        const url = (v.download_url || v.file_url || "").toLowerCase();
                        const isVideo = url.endsWith('.mp4') || url.endsWith('.mkv') || url.endsWith('.mov') || url.includes('/video/');
                        const suffix = isVideo ? '(Video)' : '(Audio)';
                        if (!(v.version_name || "").includes(suffix)) {
                            const newName = `${vName} ${suffix}`;
                            updateQueries.push(`UPDATE track_versions SET version_name = '${esc(newName)}' WHERE id = '${esc(v.id)}';`);
                            stats.versionsUpdated++;
                        }
                    });
                }
            }
        }

        deleteTrackQueries.push(`DELETE FROM tracks WHERE id NOT IN (SELECT DISTINCT track_id FROM track_versions);`);

        // ORDERED CHUNKING
        function saveChunks(prefix, queries) {
            const chunkSize = 1500;
            for (let i = 0; i < queries.length; i += chunkSize) {
                const chunk = queries.slice(i, i + chunkSize);
                fs.writeFileSync(`${prefix}_${Math.floor(i / chunkSize).toString().padStart(3, '0')}.sql`, chunk.join('\n'));
            }
        }

        saveChunks('step1_reparent', reparentQueries);
        saveChunks('step2_update', updateQueries);
        saveChunks('step3_delete_versions', deleteVersionQueries);
        saveChunks('step4_delete_tracks', deleteTrackQueries);

        console.log(`Stats:`, stats);
        console.log(`Generated ordered steps for consolidation.`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
