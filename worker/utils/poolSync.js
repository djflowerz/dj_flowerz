// worker/utils/poolSync.js
import { randomUUID } from 'node:crypto';

const TARGET_GENRES = ["Kikuyu", "Kamba", "Luhya", "Kalenjin", "Arbantone", "Rhumba", "Gengetone"];

const SOURCES = [
  {
    name: "Remix & Mashups Hub",
    url: "https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks",
    origin: "remix"
  },
  {
    name: "Vicknick Video Pool (Latest)",
    url: "https://r2.vicknickvideopool.com/api/tracks?limit=1000",
    origin: "vicknick"
  },
  ...TARGET_GENRES.map(genre => ({
    name: `Vicknick Video Pool (${genre})`,
    url: `https://r2.vicknickvideopool.com/api/tracks?search=${encodeURIComponent(genre)}`,
    origin: "vicknick"
  }))
];

function sanitizeName(name) {
  if (!name) return name;
  // Replace DJ VickNick or DJ Vick Nick (case-insensitive) with DJ Flowerz
  return name.replace(/dj\s*vick\s*nick/gi, 'DJ Flowerz');
}

export async function syncPool(env) {
  console.log("[Sync] Starting Music Pool synchronization...");
  const newTracks = [];
  const tracksToUpsert = new Map();
  const versionsData = [];

  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://djflowerz.co.ke"
        }
      });
      const tracksData = await res.json();
      console.log(`[Sync] Fetched ${tracksData.length} tracks from ${source.name}`);

      for (const item of tracksData) {
        // ID generation consistent with existing logic
        const trackIdStr = `${item.normalizedTitle || item.baseTitle}_${item.year}`;
        let trackIdNum = 0;
        for (let i = 0; i < trackIdStr.length; i++) {
          trackIdNum = Math.imul(31, trackIdNum) + trackIdStr.charCodeAt(i) | 0;
        }
        const safeTrackId = 'ext_' + Math.abs(trackIdNum);

        // Categorization logic
        let hub = item.year || 'Collection';
        let genre = item.month || 'General';

        if (item.key) {
          const parts = item.key.split('/');
          if (parts.length >= 2) {
            const topDir = parts[0];
            const subDir = parts[1];

            if (topDir === 'Locals') {
              hub = 'Locals';
              genre = subDir;
            } else if (topDir === 'Genres') {
              hub = 'Genres';
              genre = subDir;
            } else if (topDir.includes('Video Pool Edits')) {
              hub = 'Video Pool';
              genre = topDir;
            } else if (source.origin === 'remix' || topDir === 'Remix & Mashups Hub') {
              hub = 'Remix & Mashups Hub';
              genre = subDir || 'General';
            }
          }
        }

        if (!tracksToUpsert.has(safeTrackId)) {
          let artist = 'Unknown';
          let title = item.baseTitle;
          if (item.baseTitle.includes('-')) {
            const parts = item.baseTitle.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
          }

          // Apply DJ Name Replacement
          artist = sanitizeName(artist);
          title = sanitizeName(title);

          tracksToUpsert.set(safeTrackId, {
            id: safeTrackId,
            title,
            artist,
            genre,
            collection_hub: hub,
            release_year: parseInt(item.year) || 2026,
            release_month: item.month || 'March',
            created_at: item.uploaded || new Date().toISOString()
          });
        }

        const versionIdStr = item.key;
        let versionIdNum = 0;
        for (let i = 0; i < versionIdStr.length; i++) {
          versionIdNum = Math.imul(31, versionIdNum) + versionIdStr.charCodeAt(i) | 0;
        }
        const safeVersionId = 'ver_' + Math.abs(versionIdNum);

        const r2Url = source.origin === "remix" 
          ? `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${item.key.split('/').map(encodeURIComponent).join('/')}`
          : `https://r2.vicknickvideopool.com/${item.key.split('/').map(encodeURIComponent).join('/')}`;

        versionsData.push({
          id: safeVersionId,
          track_id: safeTrackId,
          version_name: item.version || 'Original',
          preview_url: r2Url,
          download_url: r2Url,
          is_video: item.type === 'video' ? 1 : 0,
          created_at: item.uploaded || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(`[Sync Error] Failed to fetch ${source.name}:`, err.message);
    }
  }

  // Perform D1 Upserts in batches
  const batchSize = 100;
  const trackEntries = Array.from(tracksToUpsert.values());
  const queries = [];

  for (let i = 0; i < trackEntries.length; i += batchSize) {
    const chunk = trackEntries.slice(i, i + batchSize);
    for (const t of chunk) {
      queries.push(env.DB.prepare(`
        INSERT INTO tracks (id, title, artist, genre, collection_hub, release_year, release_month, created_at, updated_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET 
          title=excluded.title, 
          artist=excluded.artist, 
          genre=excluded.genre, 
          collection_hub=excluded.collection_hub,
          release_year=excluded.release_year,
          release_month=excluded.release_month,
          updated_at=excluded.updated_at,
          is_active=1
      `).bind(t.id, t.title, t.artist, t.genre, t.collection_hub, t.release_year, t.release_month, t.created_at, new Date().toISOString()));
    }
  }

  for (let i = 0; i < versionsData.length; i += batchSize) {
    const chunk = versionsData.slice(i, i + batchSize);
    for (const v of chunk) {
      queries.push(env.DB.prepare(`
        INSERT INTO track_versions (id, track_id, version_name, file_url, download_url, is_video, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `).bind(v.id, v.track_id, v.version_name, v.preview_url, v.download_url, v.is_video, v.created_at));
    }
  }

  // Execute D1 Batch
  let addedCount = 0;
  if (queries.length > 0) {
    // Break into chunks of 100 queries per batch to avoid D1 limits
    for (let i = 0; i < queries.length; i += 100) {
      await env.DB.batch(queries.slice(i, i + 100));
    }
    addedCount = trackEntries.length;
  }

  // Create notification for Admin Dashboard if new tracks added
  if (addedCount > 0) {
    const notificationId = randomUUID();
    const today = new Date().toISOString().split('T')[0];
    await env.DB.prepare(`
      INSERT INTO sync_notifications (id, type, message, count, created_at)
      VALUES (?, 'music_pool_sync', ?, ?, ?)
    `).bind(notificationId, `Successfully synced ${addedCount} tracks from external sources.`, addedCount, today).run();
  }

  console.log(`[Sync] Completed. ${addedCount} tracks processed.`);
  return addedCount;
}
