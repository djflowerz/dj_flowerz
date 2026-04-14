import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';
import { normalizeUrlPath, getSongFingerprint, cleanMetadata } from '../../utils/normalization.js';

export async function handlePoolConsolidate(request, env) {
    // 1. Auth check
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        console.log("[Consolidate] Starting Music Pool database consolidation...");

        // 2. Fetch all data
        const { results: allTracks } = await env.DB.prepare(`SELECT * FROM tracks`).all();
        const { results: allVersions } = await env.DB.prepare(`SELECT * FROM track_versions`).all();

        const stats = {
            versionsChecked: allVersions.length,
            versionsDeleted: 0,
            tracksChecked: allTracks.length,
            tracksDeleted: 0,
            versionsReparented: 0,
            versionsUpdated: 0
        };

        const queries = [];

        // 3. PASS 1: Purge Actual URL Clones (e.g. "Song (1).mp3" duplicates)
        const urlMap = new Map(); // Fingerprint -> Master Version
        const redundantIdsByUrl = [];

        for (const v of allVersions) {
            const url = v.download_url || v.file_url || v.preview_url;
            if (!url) continue;

            const fingerprint = normalizeUrlPath(url);
            if (urlMap.has(fingerprint)) {
                redundantIdsByUrl.push(v.id);
                stats.versionsDeleted++;
            } else {
                urlMap.set(fingerprint, v);
            }
        }

        if (redundantIdsByUrl.length > 0) {
            for (let i = 0; i < redundantIdsByUrl.length; i += 50) {
                const chunk = redundantIdsByUrl.slice(i, i + 50);
                const placeholders = chunk.map(() => '?').join(',');
                queries.push(env.DB.prepare(`DELETE FROM track_versions WHERE id IN (${placeholders})`).bind(...chunk));
            }
        }

        // 4. PASS 2: Distinguish Audio vs Video by Name
        const remainingVersions = allVersions.filter(v => !redundantIdsByUrl.includes(v.id));
        const trackVersionGroups = new Map(); // trackId -> [versions]

        for (const v of remainingVersions) {
            const list = trackVersionGroups.get(v.track_id) || [];
            list.push(v);
            trackVersionGroups.set(v.track_id, list);
        }

        for (const [trackId, versions] of trackVersionGroups.entries()) {
            // Check for name collisions within this track
            const nameToVersions = new Map();
            for (const v of versions) {
                const name = (v.version_name || 'Main').replace(/\((Audio|Video)\)$/i, '').trim();
                const list = nameToVersions.get(name) || [];
                list.push(v);
                nameToVersions.set(name, list);
            }

            for (const [baseName, vList] of nameToVersions.entries()) {
                if (vList.length > 1) {
                    // Collision found. Are they different formats?
                    for (const v of vList) {
                        const url = (v.download_url || '').toLowerCase();
                        const isVideo = url.endsWith('.mp4') || url.endsWith('.mkv') || url.endsWith('.mov') || url.includes('/video/');
                        const suffix = isVideo ? '(Video)' : '(Audio)';
                        
                        if (!v.version_name.includes(suffix)) {
                            const newName = `${baseName} ${suffix}`;
                            queries.push(env.DB.prepare(`UPDATE track_versions SET version_name = ? WHERE id = ?`).bind(newName, v.id));
                            v.version_name = newName; // Update local state for subsequent maps
                            stats.versionsUpdated++;
                        }
                    }
                }
            }
        }

        // 5. PASS 3: Deduplicate Tracks by Song Fingerprint & Merge Categories
        const trackMap = new Map(); // Fingerprint -> Master Track
        const trackDeletions = [];

        for (const t of allTracks) {
            const fingerprint = getSongFingerprint(t.artist, t.title);
            
            if (trackMap.has(fingerprint)) {
                const master = trackMap.get(fingerprint);
                
                // Reparent versions
                const orphanedVersions = remainingVersions.filter(v => v.track_id === t.id);
                for (const ov of orphanedVersions) {
                    queries.push(env.DB.prepare(`UPDATE track_versions SET track_id = ? WHERE id = ?`).bind(master.id, ov.id));
                    ov.track_id = master.id; 
                    stats.versionsReparented++;
                }

                // Merge Categories
                try {
                    const mCats = master.category ? (Array.isArray(master.category) ? master.category : JSON.parse(master.category)) : [];
                    const tCats = t.category ? (Array.isArray(t.category) ? t.category : JSON.parse(t.category)) : [];
                    const combined = [...new Set([...mCats, ...tCats])];
                    master.category = JSON.stringify(combined);
                    queries.push(env.DB.prepare(`UPDATE tracks SET category = ? WHERE id = ?`).bind(JSON.stringify(combined), master.id));
                } catch (e) {
                    // Primitive string fallback
                    if (t.category && master.category !== t.category && !master.category.includes(t.category)) {
                        master.category = `${master.category}, ${t.category}`;
                        queries.push(env.DB.prepare(`UPDATE tracks SET category = ? WHERE id = ?`).bind(master.category, master.id));
                    }
                }

                trackDeletions.push(t.id);
                stats.tracksDeleted++;
            } else {
                trackMap.set(fingerprint, t);
                
                // Clean metadata
                const cleanArtist = cleanMetadata(t.artist);
                const cleanTitle = cleanMetadata(t.title);
                if (cleanArtist !== t.artist || cleanTitle !== t.title) {
                    queries.push(env.DB.prepare(`UPDATE tracks SET artist = ?, title = ? WHERE id = ?`).bind(cleanArtist, cleanTitle, t.id));
                }
            }
        }

        // 6. PASS 4: Zero-Version Sweep
        queries.push(env.DB.prepare(`
            DELETE FROM tracks 
            WHERE id NOT IN (SELECT DISTINCT track_id FROM track_versions)
        `));

        // 7. Execute D1 Batch
        if (trackDeletions.length > 0) {
            for (let i = 0; i < trackDeletions.length; i += 50) {
                const chunk = trackDeletions.slice(i, i + 50);
                const placeholders = chunk.map(() => '?').join(',');
                queries.push(env.DB.prepare(`DELETE FROM tracks WHERE id IN (${placeholders})`).bind(...chunk));
            }
        }

        if (queries.length > 0) {
            console.log(`[Consolidate] Executing ${queries.length} cleanup/relabel queries...`);
            for (let i = 0; i < queries.length; i += 50) {
                await env.DB.batch(queries.slice(i, i + 50));
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Consolidation complete! Kept Audio/Video variants distinct. Purged ${stats.versionsDeleted} true clones and ${stats.tracksDeleted} duplicate tracks. Categories merged.`,
            stats
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error('[Consolidate Error]', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
