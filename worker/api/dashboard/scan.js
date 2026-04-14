// Server-side music pool scanner: scrapes upstream sources,
// deduplicates against the live D1 tracks DB, and stages results in R2.

import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';

const REMIX_HUB_URL = 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks';
const VID_POOL_URL  = 'https://r2.vicknickvideopool.com/';

import { normalizeUrlPath, cleanMetadata, extractVersionInfo } from '../../utils/normalization.js';

const norm = (u) => normalizeUrlPath(u);

export async function handlePoolScan(request, env, ctx) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const sinceTime = new Date(body.scanSince || Date.now() - 30 * 24 * 60 * 60 * 1000).getTime();

        // ── 1. Gather incoming tracks from external sources ───────────────────
        let allIncoming = [];

        // Remix Hub (JSON API)
        try {
            const resp = await fetch(REMIX_HUB_URL, {
                headers: { 'User-Agent': 'DJFlowerz-Scanner/1.0' }
            });
            if (resp.ok) {
                const tracks = await resp.json();
                if (Array.isArray(tracks)) {
                    allIncoming = [...allIncoming, ...tracks.map(t => ({ ...t, _origin: 'remixHub' }))];
                }
            } else {
                console.warn('[Scan] Remix Hub returned', resp.status);
            }
        } catch (e) {
            console.error('[Scan] Remix Hub fetch failed:', e.message);
        }

        // Video Pool (HTML page with embedded ALL_TRACKS JS variable)
        try {
            const resp = await fetch(VID_POOL_URL, {
                headers: { 'User-Agent': 'DJFlowerz-Scanner/1.0' }
            });
            if (resp.ok) {
                const html = await resp.text();
                const match = html.match(/ALL_TRACKS\s*=\s*(\[[\s\S]*?\]);/);
                if (match && match[1]) {
                    const tracks = JSON.parse(match[1]);
                    if (Array.isArray(tracks)) {
                        allIncoming = [...allIncoming, ...tracks.map(t => ({ ...t, _origin: 'vidPool' }))];
                    }
                }
            } else {
                console.warn('[Scan] Video Pool returned', resp.status);
            }
        } catch (e) {
            console.error('[Scan] Video Pool fetch failed:', e.message);
        }

        // ── 2. Build deduplication sets from live D1 DB ───────────────────────
        const poolUrls = new Set();

        const { results: existingTracks } = await env.DB.prepare(`
            SELECT audio_url, download_url, preview_url FROM tracks
        `).all();

        const { results: existingVersions } = await env.DB.prepare(`
            SELECT download_url FROM track_versions
        `).all();

        (existingTracks || []).forEach(t => {
            if (t.audio_url)    poolUrls.add(norm(t.audio_url));
            if (t.download_url) poolUrls.add(norm(t.download_url));
            if (t.preview_url)  poolUrls.add(norm(t.preview_url));
        });

        (existingVersions || []).forEach(v => {
            if (v.download_url) poolUrls.add(norm(v.download_url));
        });

        // ── 3. Build deduplication sets from R2 staging queue ────────────────
        const stagedIds  = new Set();
        const stagedUrls = new Set();

        try {
            const scannedList = await env.R2_BUCKET.list({ prefix: 'scanned_tracks/' });
            const objects = scannedList.objects || [];

            objects.forEach(obj => {
                const id = obj.key.replace('scanned_tracks/', '').replace('.json', '');
                stagedIds.add(id);
            });

            // Fetch up to 150 staged JSONs to extract their URLs for dedupe
            let fetches = 0;
            for (const obj of objects) {
                if (++fetches > 150) break;
                try {
                    const r2Obj = await env.R2_BUCKET.get(obj.key);
                    if (r2Obj) {
                        const data = await r2Obj.json();
                        if (data.downloadUrl) stagedUrls.add(norm(data.downloadUrl));
                    }
                } catch (_) {}
            }
        } catch (e) {
            console.error('[Scan] R2 staging read failed:', e.message);
        }

        // ── 4. Filter, normalize, rebrand, and collect tracks to save ─────────
        const toSave = [];
        let skippedOld  = 0;
        let skippedDupe = 0;

        for (const t of allIncoming) {
            // Date gate
            const uploadTime = new Date(t.uploaded || t.date || Date.now()).getTime();
            if (uploadTime < sinceTime) { skippedOld++; continue; }

            const key = t.key || t.storagePath || t.id;
            if (!key) continue;

            const scannedId = `scanned_${key.replace(/\//g, '_').replace(/\s+/g, '_')}`;

            // Build absolute download URL
            let downloadUrl = t.url || t.downloadUrl || '';
            if (!downloadUrl && t._origin === 'remixHub' && t.key) {
                const encodedPath = t.key.split('/').map(encodeURIComponent).join('/');
                downloadUrl = `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${encodedPath}`;
            } else if (downloadUrl && !downloadUrl.startsWith('http')) {
                // Return relative path to our own proxy
                const keyPath = downloadUrl.replace(/^\//, '');
                downloadUrl = `/api/files/${keyPath}`;
            } else if (downloadUrl.includes('vicknickvideopool.com')) {
                // Swap direct Vicknick URLs for our branded proxy
                const urlObj = new URL(downloadUrl);
                const keyPath = urlObj.pathname.replace(/^\//, '');
                downloadUrl = `/api/files/${keyPath}`;
            } else if (!downloadUrl) {
                downloadUrl = `/api/files/${key}`;
            }

            const normalizedDl = norm(downloadUrl);

            // Strict deduplication: skip if already in D1 pool or staging queue
            if (poolUrls.has(normalizedDl) || stagedIds.has(scannedId) || stagedUrls.has(normalizedDl)) {
                skippedDupe++;
                continue;
            }

            // Add to in-flight dedupe sets so within-scan dupes are also caught
            stagedIds.add(scannedId);
            if (downloadUrl) stagedUrls.add(normalizedDl);

            // Auto-brand: rename DJ VICKNICK → DJ FLOWERZ + Extract Version
            let cleanRawTitle = cleanMetadata(t.baseTitle || t.normalizedTitle || t.title || 'Untitled');
            const { baseTitle, versionName } = extractVersionInfo(cleanRawTitle);

            // Separate artist and title if needed
            let artist = t.artist || 'Unknown Artist';
            let displayTitle = baseTitle;

            if (baseTitle.includes(' - ')) {
                const parts = baseTitle.split(' - ');
                artist = cleanMetadata(parts[0].trim());
                displayTitle = parts.slice(1).join(' - ').trim();
            }

            // Collection / genre mapping
            let collectionHub = t.collectionHub || t.collection_hub || t.year || '';
            if (!collectionHub) {
                collectionHub = t._origin === 'remixHub' ? 'Edits' : 'Video Pool';
            }

            let genre = t.genre || t.month || 'Other';

            toSave.push({
                id:             scannedId,
                source:         t.source || 'CloudFlare R2 (Auto)',
                title:          displayTitle,
                artist,
                genre:          cleanMetadata(genre),
                version_name:   versionName,
                collection_hub: collectionHub,
                bpm:            t.bpm || null,
                downloadUrl,
                previewUrl:     t.previewUrl || downloadUrl,
                dateAdded:      t.uploaded || t.date || new Date().toISOString(),
                status:         'scanned',
                created_at:     new Date().toISOString(),
            });
        }

        // ── 5. Persist new scanned tracks to R2 staging area ─────────────────
        const putPromises = toSave.map(track =>
            env.R2_BUCKET.put(
                `scanned_tracks/${track.id}.json`,
                JSON.stringify(track),
                { httpMetadata: { contentType: 'application/json' } }
            )
        );
        await Promise.allSettled(putPromises);

        const message = toSave.length > 0
            ? `✅ Found ${allIncoming.length} total — ${skippedOld} before date, ${skippedDupe} already in pool/queue. Saved ${toSave.length} new tracks to staging.`
            : `✅ Scan complete — ${allIncoming.length} checked, no new tracks since ${body.scanSince || '30 days ago'}. (${skippedDupe} already in pool/queue, ${skippedOld} before date cutoff)`;

        return new Response(JSON.stringify({
            success: true,
            message,
            found:   allIncoming.length,
            saved:   toSave.length,
            skipped: { old: skippedOld, dupe: skippedDupe },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error('[Admin Scan] Error:', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
