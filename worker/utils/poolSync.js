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
  let sanitized = name.replace(/dj\s*vick\s*nick/gi, 'DJ Flowerz');
  
  // Also correct common spelling errors in genres/hubs
  const spellingMap = {
    'Reggae Fussion': 'Reggae Fusion',
    'Afrobeat (TBT)': 'Afrobeats (TBT)',
    'Riddimz F\'': 'Riddimz F',
    'Bongo Flava (TBT) (TZ)Low Hype': 'Bongo Flava (TBT) (TZ) Low Hype'
  };

  for (const [bad, good] of Object.entries(spellingMap)) {
    if (sanitized === bad) return good;
  }
  
  return sanitized;
}

export async function syncPool(env) {
  console.log("[Sync] Starting Music Pool synchronization...");
  const newTracks = [];
  const tracksToUpsert = new Map();
  const versionsData = [];

  // --- Deduplication: fetch all existing version URLs up-front ---
  let existingUrls = new Set();
  try {
    const existingResult = await env.DB.prepare(
      `SELECT preview_url, download_url FROM track_versions WHERE preview_url IS NOT NULL OR download_url IS NOT NULL`
    ).all();
    existingResult.results.forEach(r => {
      if (r.preview_url) existingUrls.add(r.preview_url);
      if (r.download_url) existingUrls.add(r.download_url);
    });
    console.log(`[Sync] Loaded ${existingUrls.size} existing version URLs for dedup.`);
  } catch (e) {
    console.warn("[Sync] Could not load existing URLs for dedup:", e.message);
  }

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
        // Generate an ID for the track based on normalizedTitle
        // Strip out common version tags to improve grouping
        const cleanTitle = (item.normalizedTitle || item.baseTitle || '')
            .toLowerCase()
            .replace(/\((clean|dirty|short edit|acap|extended|remix|edit)\)/gi, '')
            .replace(/-(clean|dirty|short edit|acap|extended|remix|edit)/gi, '')
            .trim();

        const trackIdStr = `${cleanTitle}_${item.year}`;
        let trackIdNum = 0;
        for (let i = 0; i < trackIdStr.length; i++) {
          trackIdNum = Math.imul(31, trackIdNum) + trackIdStr.charCodeAt(i) | 0;
        }
        const safeTrackId = 'ext_' + Math.abs(trackIdNum);

        // Ensure URLs are consistent and defined BEFORE used in Track record
        const r2Url = source.origin === "remix" 
          ? `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${item.key.split('/').map(encodeURIComponent).join('/')}`
          : `https://cdn.vicknickvideopool.com/${item.key.split('/').map(encodeURIComponent).join('/')}`;

        // --- Categorization: derive hub and genre from the R2 file path ---
        let hub = item.year || 'Collection';
        let genre = 'Uncategorized';

        if (item.key) {
          const parts = item.key.split('/');
          const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          const YEAR_REGEX = /\b(20\d{2})\b/; // Matches 2000-2099

          // --- 1. Extract metadata from parts ---
          let foundYear;
          let foundMonth;
          
          for (const p of parts) {
            // Find year (e.g. "2026 VIDEO POOL EDITS" -> 2026)
            if (!foundYear) {
              const yearMatch = p.match(YEAR_REGEX);
              if (yearMatch) foundYear = parseInt(yearMatch[1]);
            }
            // Find month (e.g. "March 2026 Edits" -> March)
            if (!foundMonth) {
              const monthMatch = MONTH_NAMES.find(m => p.includes(m));
              if (monthMatch) foundMonth = monthMatch;
            }
          }
          
          if (foundYear) item.year = foundYear;
          if (foundMonth) item.month = foundMonth;

          // --- 2. Determine Hub and Genre from path ---
          if (parts.length >= 1) {
            const topDir = parts[0];
            const subDir = parts[1] || 'General';

            if (topDir === 'Locals') {
              hub = 'Locals';
              genre = subDir;
            } else if (topDir === 'Genres') {
              hub = 'Main Pool';
              genre = subDir;
              if (subDir === 'Locals' && parts[2]) genre = parts[2];
            } else if (topDir.toLowerCase().includes('video pool') || foundYear) {
              // Any folder with a Year or mention of "Video Pool" goes into the Video Pool hub
              hub = 'Video Pool';
              
              // Determine genre: use subDir if it's not the year/month folder
              if (subDir && subDir !== 'General' && !MONTH_NAMES.some(m => subDir.includes(m)) && !YEAR_REGEX.test(subDir)) {
                genre = subDir;
              } else if (parts[2] && !MONTH_NAMES.some(m => parts[2].includes(m))) {
                genre = parts[2];
              } else if (!topDir.toLowerCase().includes('video pool')) {
                // If it's a year folder but not explicitly "Video Pool", use the year folder name as hint
                genre = topDir;
              } else {
                genre = 'Main Pool Edits';
              }
            } else if (source.origin === 'remix' || topDir.toLowerCase().includes('remix')) {
              hub = 'Remix & Mashups Hub';
              genre = (subDir && subDir !== 'General') ? subDir : 'Mashups';
            } else {
              hub = topDir;
              genre = subDir;
            }
          }
        }

        // Safety: never store empty or whitespace-only genres
        if (!genre || genre.trim() === '') genre = 'Uncategorized';

        if (!tracksToUpsert.has(safeTrackId)) {
          let artist = 'Unknown';
          let title = item.baseTitle;
          if (item.baseTitle.includes('-')) {
            const parts = item.baseTitle.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
          }

          // Apply DJ Name Replacement & Spelling Correction
          artist = sanitizeName(artist);
          title = sanitizeName(title);
          genre = sanitizeName(genre);
          hub = sanitizeName(hub);

          // Month and Year are already extracted and stored in item.year/item.month from the logic above
          const month = item.month || 'Other';
          const year = item.year || new Date().getFullYear();

          tracksToUpsert.set(safeTrackId, {
            id: safeTrackId,
            title,
            artist,
            genre,
            collection_hub: hub,
            audio_url: r2Url,
            download_url: r2Url,
            release_year: year,
            release_month: month,
            created_at: item.uploaded || new Date().toISOString()
          });
        }

        const versionIdStr = item.key;
        let versionIdNum = 0;
        for (let i = 0; i < versionIdStr.length; i++) {
          versionIdNum = Math.imul(31, versionIdNum) + versionIdStr.charCodeAt(i) | 0;
        }
        const safeVersionId = 'ver_' + Math.abs(versionIdNum);

        // --- Dedup check: skip if this exact URL already exists in D1 ---
        if (existingUrls.has(r2Url)) {
          // URL already in DB — skip this version (track may still be upserted for metadata updates)
          continue;
        }

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

  // Extract unique genres for registration
  const uniqueGenres = Array.from(new Set(Array.from(tracksToUpsert.values()).map(t => t.genre)));
  const queries = [];

  // 1. Upsert Genres — skip placeholder/fallback genres
  const SKIP_GENRES = new Set(['General', 'Uncategorized', '', null, undefined]);
  for (const gName of uniqueGenres) {
    if (SKIP_GENRES.has(gName)) continue;
    // Build a safe, deterministic ID: lowercase, replace non-alphanumeric with underscore, max 80 chars
    const gId = gName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80);
    if (!gId) continue;
    queries.push(env.DB.prepare(`
      INSERT INTO genres (id, name) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).bind(gId, gName));
  }

  // 2. Upsert Tracks
  const trackEntries = Array.from(tracksToUpsert.values());
  for (const t of trackEntries) {
    queries.push(env.DB.prepare(`
      INSERT INTO tracks (id, title, artist, genre, collection_hub, audio_url, download_url, release_year, release_month, created_at, updated_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET 
        title=excluded.title, 
        artist=excluded.artist, 
        genre=excluded.genre, 
        collection_hub=excluded.collection_hub,
        audio_url=COALESCE(excluded.audio_url, tracks.audio_url),
        download_url=COALESCE(excluded.download_url, tracks.download_url),
        release_year=excluded.release_year,
        release_month=excluded.release_month,
        updated_at=excluded.updated_at,
        is_active=1
    `).bind(t.id, t.title, t.artist, t.genre, t.collection_hub, t.audio_url, t.download_url, t.release_year, t.release_month, t.created_at, new Date().toISOString()));
  }

  // 3. Upsert Versions
  for (const v of versionsData) {
    queries.push(env.DB.prepare(`
      INSERT INTO track_versions (id, track_id, version_name, preview_url, file_url, download_url, is_video, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        preview_url=COALESCE(excluded.preview_url, track_versions.preview_url),
        download_url=COALESCE(excluded.download_url, track_versions.download_url),
        file_url=COALESCE(excluded.file_url, track_versions.file_url)
    `).bind(v.id, v.track_id, v.version_name, v.preview_url, v.preview_url, v.download_url, v.is_video, v.created_at));
  }

  // Execute D1 Batch
  let addedCount = 0;
  if (queries.length > 0) {
    // Break into chunks of 100 queries per batch to avoid D1 limits
    for (let i = 0; i < queries.length; i += 100) {
      await env.DB.batch(queries.slice(i, i + 100));
    }
    // Count only genuinely new version records (after dedup filtering)
    addedCount = versionsData.length;
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
