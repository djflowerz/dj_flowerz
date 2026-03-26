import fs from 'fs';

async function sync() {
  const allTracksSql = [];
  const allVersionsSql = [];
  const tracksMap = new Map();
  const versionsData = [];

  console.log("Loading tracks from remix_tracks_data.json...");
  const rawData = fs.readFileSync('remix_tracks_data.json', 'utf8');
  const remixTracks = JSON.parse(rawData);
  console.log(`Loaded ${remixTracks.length} tracks.`);

  for (const item of remixTracks) {
    const baseTitle = item.title; 
    const subDir = item.artist;
    const cleanTitle = baseTitle.toLowerCase().trim();
    const yearHint = "2026"; // Default for these
    
    const trackIdStr = `${cleanTitle}_${yearHint}`;
    let trackIdNum = 0;
    for (let i = 0; i < trackIdStr.length; i++) {
        trackIdNum = Math.imul(31, trackIdNum) + trackIdStr.charCodeAt(i) | 0;
    }
    const safeTrackId = 'ext_' + Math.abs(trackIdNum);

    const r2Url = item.downloadLink;
    const hub = 'Remix & Mashups Hub';
    const genre = subDir;

    if (!tracksMap.has(safeTrackId)) {
        let artist = 'Unknown';
        let title = baseTitle;
        if (baseTitle.includes('-')) {
            const parts = baseTitle.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
        }

        tracksMap.set(safeTrackId, {
            id: safeTrackId,
            title: title,
            artist: artist,
            genre: genre,
            collection_hub: hub,
            file_url: r2Url,
            year: 2026
        });
    }

    let versionName = 'Original';
    if (r2Url.includes('(Clean)')) versionName = 'Clean';
    else if (r2Url.includes('(Dirty)')) versionName = 'Dirty';
    else if (r2Url.includes('(Intro)')) versionName = 'Intro';
    else if (r2Url.includes('(Short Edit)')) versionName = 'Short Edit';
    else {
        const match = r2Url.match(/\(([^)]+)\)\.mp3/);
        if (match) versionName = match[1];
    }

    const versionIdStr = r2Url;
    let versionIdNum = 0;
    for (let i = 0; i < versionIdStr.length; i++) {
        versionIdNum = Math.imul(31, versionIdNum) + versionIdStr.charCodeAt(i) | 0;
    }
    const safeVersionId = 'ver_' + Math.abs(versionIdNum);

    versionsData.push({
        id: safeVersionId,
        track_id: safeTrackId,
        version_name: versionName,
        preview_url: r2Url,
        file_url: r2Url,
        download_url: r2Url
    });
  }

  const now = new Date().toISOString();
  const escape = (str) => (str || '').toString().replace(/'/g, "''");

  // Generate tracks SQL (One per line for easy chunking)
  tracksMap.forEach((t, id) => {
    allTracksSql.push(`INSERT INTO tracks (id, title, artist, genre, collection_hub, file_url, release_year, created_at, updated_at, is_active) VALUES ('${id}', '${escape(t.title)}', '${escape(t.artist)}', '${escape(t.genre)}', '${escape(t.collection_hub)}', '${escape(t.file_url)}', ${t.year}, '${now}', '${now}', 1) ON CONFLICT(id) DO UPDATE SET genre=excluded.genre, collection_hub=excluded.collection_hub, file_url=excluded.file_url, release_year=excluded.release_year, updated_at=excluded.updated_at, is_active=1;`);
  });

  // Generate versions SQL (One per line)
  versionsData.forEach(v => {
    allVersionsSql.push(`INSERT INTO track_versions (id, track_id, version_name, file_url, download_url, preview_url, is_video, created_at) VALUES ('${v.id}', '${v.track_id}', '${escape(v.version_name)}', '${escape(v.file_url)}', '${escape(v.download_url)}', '${escape(v.preview_url)}', 0, '${now}') ON CONFLICT(id) DO UPDATE SET preview_url=excluded.preview_url, file_url=excluded.file_url, download_url=excluded.download_url;`);
  });

  fs.writeFileSync('import_pool_remix.sql', [...allTracksSql, ...allVersionsSql].join('\n'));
  console.log(`Generated import_pool_remix.sql: ${tracksMap.size} tracks, ${versionsData.length} versions.`);
}

sync();
