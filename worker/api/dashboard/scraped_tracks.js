// worker/api/dashboard/scraped_tracks.js
// Handles the "Scanned Updates" queue — tracks fetched from external sources
// pending admin approval before they are added to the live music pool.
import { getAuthorizedUser } from '../../utils/auth.js';

const REMIX_HUB_URL  = 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks';
const VID_POOL_BASE  = 'https://r2.vicknickvideopool.com/';

// ── Main Handler ─────────────────────────────────────────────────────────────
export async function handleScrapedTracks(request, env, ctx, params) {
    const url    = new URL(request.url);
    const method = request.method;

    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // GET /api/admin/scraped-tracks — list pending tracks
        if (method === 'GET' && !url.pathname.includes('/scan')) {
            const status = url.searchParams.get('status') || 'pending';
            const { results } = await env.DB.prepare(`
                SELECT * FROM scraped_tracks
                WHERE status = ?
                ORDER BY scraped_at DESC
                LIMIT 200
            `).bind(status).all();
            return Response.json(results || []);
        }

        // POST /api/admin/scraped-tracks/scan — trigger a fresh scrape
        if (method === 'POST' && url.pathname.includes('/scan')) {
            const added = await scrapeAndSave(env);
            return Response.json({ success: true, new_tracks: added });
        }

        // POST /api/admin/scraped-tracks/approve — approve selected IDs
        if (method === 'POST' && url.pathname.includes('/approve')) {
            const { ids } = await request.json();
            if (!Array.isArray(ids) || ids.length === 0) {
                return Response.json({ error: 'No track IDs provided' }, { status: 400 });
            }

            let approved = 0;
            for (const id of ids) {
                const track = await env.DB.prepare(`SELECT * FROM scraped_tracks WHERE id = ?`).bind(id).first();
                if (!track) continue;

                // Insert into main pool tracks table
                try {
                    await env.DB.prepare(`
                        INSERT OR IGNORE INTO tracks (
                            id, title, artist, genre, bpm, key_signature,
                            collection_hub, source_url, file_url, duration,
                            created_at, updated_at
                        ) VALUES (
                            lower(hex(randomblob(16))),
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            datetime('now'), datetime('now')
                        )
                    `).bind(
                        track.title, track.artist, track.genre, track.bpm, track.key_signature,
                        track.collection_hub || 'External Pool',
                        track.source_url, track.file_url, track.duration
                    ).run();
                    approved++;
                } catch (e) {
                    console.error('[ScrapedTracks] Insert to pool failed:', e.message);
                }

                // Mark as approved
                await env.DB.prepare(`
                    UPDATE scraped_tracks SET status = 'approved', reviewed_at = datetime('now')
                    WHERE id = ?
                `).bind(id).run();
            }

            await env.DB.prepare(`INSERT INTO admin_logs (action, details) VALUES (?, ?)`)
                .bind('SCRAPED_TRACKS_APPROVED', `${approved} of ${ids.length} tracks approved into pool`).run().catch(() => {});

            return Response.json({ success: true, approved });
        }

        // DELETE /api/admin/scraped-tracks/:id — reject / dismiss
        if (method === 'DELETE') {
            const id = params?.id || url.pathname.split('/').filter(Boolean).pop();
            await env.DB.prepare(`
                UPDATE scraped_tracks SET status = 'rejected', reviewed_at = datetime('now')
                WHERE id = ?
            `).bind(id).run();
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Not Found' }, { status: 404 });
    } catch (err) {
        console.error('[ScrapedTracks API Error]', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// ── Scraper Logic ─────────────────────────────────────────────────────────────
export async function scrapeAndSave(env) {
    let newCount = 0;

    // 1. Remix & Mashups Worker
    try {
        const resp = await fetch(REMIX_HUB_URL, { signal: AbortSignal.timeout(8000) });
        if (resp.ok) {
            const tracks = await resp.json();
            if (Array.isArray(tracks)) {
                for (const t of tracks) {
                    const exists = await env.DB.prepare(
                        `SELECT id FROM scraped_tracks WHERE source_url = ? OR (title = ? AND artist = ?)`
                    ).bind(t.url || '', t.title || '', t.artist || '').first().catch(() => null);

                    if (!exists) {
                        await env.DB.prepare(`
                            INSERT OR IGNORE INTO scraped_tracks
                                (id, title, artist, genre, bpm, key_signature, file_url, source_url,
                                 duration, source_name, status, scraped_at)
                            VALUES
                                (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?,
                                 ?, 'Remix Hub', 'pending', datetime('now'))
                        `).bind(
                            t.title || 'Untitled', t.artist || 'Unknown',
                            t.genre || null, t.bpm || null, t.key || null,
                            t.url || t.download_url || null,
                            t.source_url || REMIX_HUB_URL,
                            t.duration || null
                        ).run().catch(() => {});
                        newCount++;
                    }
                }
            }
        }
    } catch (e) {
        console.error('[Scraper] Remix Hub error:', e.message);
    }

    // 2. Video Pool — parse S3/R2 XML listing
    try {
        const resp = await fetch(VID_POOL_BASE + '?list-type=2&max-keys=100', {
            signal: AbortSignal.timeout(8000)
        });
        if (resp.ok) {
            const xml = await resp.text();
            // Extract Key elements from XML
            const keys = [...xml.matchAll(/<Key>([^<]+\.(mp3|wav|flac|aiff|ogg))<\/Key>/gi)]
                .map(m => m[1]);

            for (const key of keys) {
                const title = key.split('/').pop().replace(/\.[^.]+$/, '').replace(/_/g, ' ');
                const fileUrl = `${VID_POOL_BASE}${key}`;
                const exists = await env.DB.prepare(
                    `SELECT id FROM scraped_tracks WHERE file_url = ?`
                ).bind(fileUrl).first().catch(() => null);

                if (!exists) {
                    await env.DB.prepare(`
                        INSERT OR IGNORE INTO scraped_tracks
                            (id, title, artist, genre, file_url, source_url,
                             source_name, status, scraped_at)
                        VALUES
                            (lower(hex(randomblob(16))), ?, 'Unknown', 'Video Pool', ?, ?,
                             'Video Pool', 'pending', datetime('now'))
                    `).bind(title, fileUrl, VID_POOL_BASE).run().catch(() => {});
                    newCount++;
                }
            }
        }
    } catch (e) {
        console.error('[Scraper] Video Pool error:', e.message);
    }

    await env.DB.prepare(`INSERT INTO admin_logs (action, details) VALUES (?, ?)`)
        .bind('POOL_SCRAPE_COMPLETE', `${newCount} new tracks added to pending queue`).run().catch(() => {});

    console.log(`[Scraper] Scrape complete — ${newCount} new tracks queued`);
    return newCount;
}
