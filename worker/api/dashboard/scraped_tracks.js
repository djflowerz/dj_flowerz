// worker/api/dashboard/scraped_tracks.js
// Cron-triggered scheduled scan — re-uses the same core logic as the manual
// POST /api/admin/pool/scan endpoint but runs with a 30-day lookback window.

const REMIX_HUB_URL = 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks';
const norm = (u) =>
    (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').trim();

export async function scrapeAndSave(env) {
    const sinceTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30-day lookback
    let allIncoming = [];

    // Remix Hub
    try {
        const resp = await fetch(REMIX_HUB_URL, { headers: { 'User-Agent': 'DJFlowerz-Cron/1.0' } });
        if (resp.ok) {
            const tracks = await resp.json();
            if (Array.isArray(tracks)) {
                allIncoming = tracks.map(t => ({ ...t, _origin: 'remixHub' }));
            }
        }
    } catch (e) {
        console.error('[Cron Scan] Remix Hub fetch failed:', e.message);
        return;
    }

    // Build existing URL set
    const poolUrls = new Set();
    const { results: existing } = await env.DB.prepare(
        'SELECT audio_url, download_url, preview_url FROM tracks'
    ).all();
    (existing || []).forEach(t => {
        if (t.audio_url)    poolUrls.add(norm(t.audio_url));
        if (t.download_url) poolUrls.add(norm(t.download_url));
        if (t.preview_url)  poolUrls.add(norm(t.preview_url));
    });

    // Staged IDs
    const stagedIds = new Set();
    const scannedList = await env.R2_BUCKET.list({ prefix: 'scanned_tracks/' });
    (scannedList.objects || []).forEach(o => stagedIds.add(o.key.replace('scanned_tracks/', '').replace('.json', '')));

    let saved = 0;
    for (const t of allIncoming) {
        const uploadTime = new Date(t.uploaded || t.date || Date.now()).getTime();
        if (uploadTime < sinceTime) continue;

        const key = t.key || t.storagePath || t.id;
        if (!key) continue;

        const scannedId = `scanned_${key.replace(/\//g, '_').replace(/\s+/g, '_')}`;
        if (stagedIds.has(scannedId)) continue;

        let downloadUrl = t.url || t.downloadUrl || '';
        if (!downloadUrl && t.key) {
            const encodedPath = t.key.split('/').map(encodeURIComponent).join('/');
            downloadUrl = `https://cdn.vicknickvideopool.com/${encodedPath}`;
        }

        if (poolUrls.has(norm(downloadUrl))) continue;

        const title = (t.baseTitle || t.title || 'Untitled').replace(/DJ VICKNICK/gi, 'DJ FLOWERZ');
        const parts = title.split(' - ');
        const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
        const displayTitle = parts.length > 1 ? parts.slice(1).join(' - ').trim() : title;

        stagedIds.add(scannedId);
        await env.R2_BUCKET.put(`scanned_tracks/${scannedId}.json`, JSON.stringify({
            id:             scannedId,
            source:         'CloudFlare R2 (Cron)',
            title:          displayTitle,
            artist,
            genre:          t.genre || t.month || 'Other',
            collection_hub: t.year || 'Edits',
            bpm:            t.bpm || null,
            downloadUrl,
            previewUrl:     t.previewUrl || downloadUrl,
            dateAdded:      t.uploaded || new Date().toISOString(),
            status:         'scanned',
            created_at:     new Date().toISOString(),
        }), { httpMetadata: { contentType: 'application/json' } });
        saved++;
    }

    console.log(`[Cron Scan] Staged ${saved} new tracks.`);
}
