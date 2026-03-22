import fs from 'fs';
import { execSync } from 'child_process';

const TARGET_GENRES = ["Kikuyu", "Kamba", "Luhya", "Kalenjin", "Arbantone", "Rhumba", "Gengetone"];

const SOURCES = [
  {
    name: "Remix & Mashups Hub",
    url: "https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks",
    origin: "remix",
    useCurl: true,
    headers: {}
  },
  {
    name: "Vicknick Video Pool (Latest)",
    url: "https://r2.vicknickvideopool.com/api/tracks?limit=1000",
    origin: "vicknick",
    useCurl: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://djflowerz.co.ke"
    }
  },
  ...TARGET_GENRES.map(genre => ({
    name: `Vicknick Video Pool (${genre})`,
    url: `https://r2.vicknickvideopool.com/api/tracks?search=${encodeURIComponent(genre)}`,
    origin: "vicknick",
    useCurl: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://djflowerz.co.ke"
    }
  }))
];

async function sync() {
  const allTracksSql = [];
  const allVersionsSql = [];
  const tracksMap = new Map();
  const versionsData = [];

  for (const source of SOURCES) {
    console.log(`Processing tracks from ${source.name}...`);
    try {
      let tracksData;
      if (source.useCurl) {
        const headerFlags = Object.entries(source.headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
        const output = execSync(`curl -s ${headerFlags} "${source.url}"`, { maxBuffer: 100 * 1024 * 1024 });
        tracksData = JSON.parse(output.toString());
      } else {
        const res = await fetch(source.url);
        tracksData = await res.json();
      }
      console.log(`Fetched ${tracksData.length} tracks.`);

      for (const item of tracksData) {
        // ID generation consistent with existing import logic
        const trackIdStr = `${item.normalizedTitle || item.baseTitle}_${item.year}`;
        let trackIdNum = 0;
        for (let i = 0; i < trackIdStr.length; i++) {
          trackIdNum = Math.imul(31, trackIdNum) + trackIdStr.charCodeAt(i) | 0;
        }
        const safeTrackId = 'ext_' + Math.abs(trackIdNum);

        // Categorization logic - map folders to hubs/genres
        let hub = 'Video Pool';
        let genre = 'General';

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
                } else if (source.name === 'Remix & Mashups Hub' || topDir === 'Remix & Mashups Hub') {
                    hub = 'Remix & Mashups Hub';
                    genre = subDir || 'General';
                } else if (parts.length >= 3) {
                    hub = parts[0];
                    genre = parts[1];
                }
            }
        }

        if (!tracksMap.has(safeTrackId)) {
          let artist = 'Unknown';
          let title = item.baseTitle;
          if (item.baseTitle.includes('-')) {
            const parts = item.baseTitle.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
          }

          tracksMap.set(safeTrackId, {
            id: safeTrackId,
            title: title.replace(/'/g, "''"),
            artist: artist.replace(/'/g, "''"),
            genre: genre.replace(/'/g, "''"),
            collection_hub: hub.replace(/'/g, "''"),
            created_at: item.uploaded || new Date().toISOString()
          });
        }

        const versionIdStr = item.key;
        let versionIdNum = 0;
        for (let i = 0; i < versionIdStr.length; i++) {
          versionIdNum = Math.imul(31, versionIdNum) + versionIdStr.charCodeAt(i) | 0;
        }
        const safeVersionId = 'ver_' + Math.abs(versionIdNum);

        // Ensure URLs are consistent
        const r2Url = source.origin === "remix" 
          ? `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${item.key.split('/').map(encodeURIComponent).join('/')}`
          : `https://r2.vicknickvideopool.com/${item.key.split('/').map(encodeURIComponent).join('/')}`;

        versionsData.push({
          id: safeVersionId,
          track_id: safeTrackId,
          version_name: (item.version || 'Original').replace(/'/g, "''"),
          preview_url: r2Url.replace(/'/g, "''"),
          download_url: r2Url.replace(/'/g, "''"),
          is_video: item.type === 'video' ? 1 : 0,
          created_at: item.uploaded || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${source.name}:`, err.message);
    }
  }

  // Generate SQL with UPSERT to avoid duplicates and update metadata
  const batchSize = 100;
  
  const trackEntries = Array.from(tracksMap.values());
  for (let i = 0; i < trackEntries.length; i += batchSize) {
    const chunk = trackEntries.slice(i, i + batchSize);
    const values = chunk.map(t => 
      `('${t.id}', '${t.title}', '${t.artist}', '${t.genre}', '${t.collection_hub}', '${t.created_at}', '${t.created_at}', 0)`
    ).join(', ');
    
    allTracksSql.push(`INSERT INTO tracks (id, title, artist, genre, collection_hub, created_at, updated_at, is_active) VALUES ${values} ON CONFLICT(id) DO UPDATE SET genre=excluded.genre, collection_hub=excluded.collection_hub, is_active=1;`);
  }

  for (let i = 0; i < versionsData.length; i += batchSize) {
    const chunk = versionsData.slice(i, i + batchSize);
    const values = chunk.map(v =>
      `('${v.id}', '${v.track_id}', '${v.version_name}', '${v.preview_url}', '${v.download_url}', ${v.is_video}, '${v.created_at}')`
    ).join(', ');
    
    allVersionsSql.push(`INSERT INTO track_versions (id, track_id, version_name, file_url, download_url, is_video, created_at) VALUES ${values} ON CONFLICT(id) DO NOTHING;`);
  }

  fs.writeFileSync('import_pool.sql', [...allTracksSql, ...allVersionsSql].join('\n'));
  console.log(`Generated import_pool.sql: ${tracksMap.size} tracks, ${versionsData.length} versions.`);
}

sync();
