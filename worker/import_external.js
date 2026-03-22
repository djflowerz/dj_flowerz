import fs from 'fs';
import { randomUUID } from 'crypto';

async function main() {
  console.log('Fetching tracks from external API...');
  const res = await fetch('https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks');
  const tracksData = await res.json();
  console.log(`Fetched ${tracksData.length} tracks.`);

  const tracksMap = new Map(); // trackId -> trackData
  const versionsData = [];
  let sqlLines = [];

  for (const item of tracksData) {
    // Generate an ID for the track based on normalizedTitle
    // That way, different versions of the same track group together
    const trackIdStr = `${item.normalizedTitle || item.baseTitle}_${item.year}`;
    let trackId = 0;
    for (let i = 0; i < trackIdStr.length; i++) {
        trackId = Math.imul(31, trackId) + trackIdStr.charCodeAt(i) | 0;
    }
    const safeTrackId = 'ext_' + Math.abs(trackId);

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
            genre: (item.month || 'General').replace(/'/g, "''"),
            collection_hub: (item.year || 'Collection').replace(/'/g, "''"),
            created_at: item.uploaded || new Date().toISOString()
        });
    }

    const versionIdStr = item.key;
    let versionId = 0;
    for (let i = 0; i < versionIdStr.length; i++) {
        versionId = Math.imul(31, versionId) + versionIdStr.charCodeAt(i) | 0;
    }
    const safeVersionId = 'ver_' + Math.abs(versionId);

    // Some URLs need encoding because of spaces
    const r2Url = `https://r2.vicknickvideopool.com/${item.key.split('/').map(encodeURIComponent).join('/')}`;
    
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

  // Batch insert in chunks of 50 to avoid limits
  let batchSize = 50;
  
  // Prepare Tracks SQL
  const trackValues = Array.from(tracksMap.values()).map(t => 
    `('${t.id}', '${t.title}', '${t.artist}', '${t.genre}', '${t.collection_hub}', '${t.created_at}', '${t.created_at}')`
  );

  for (let i = 0; i < trackValues.length; i += batchSize) {
      const chunk = trackValues.slice(i, i + batchSize);
      sqlLines.push(`INSERT OR IGNORE INTO tracks (id, title, artist, genre, collection_hub, created_at, updated_at) VALUES ${chunk.join(', ')};`);
  }

  // Prepare Versions SQL
  const versionValues = versionsData.map(v =>
    `('${v.id}', '${v.track_id}', '${v.version_name}', '${v.preview_url}', '${v.download_url}', ${v.is_video}, '${v.created_at}')`
  );

  for (let i = 0; i < versionValues.length; i += batchSize) {
      const chunk = versionValues.slice(i, i + batchSize);
      sqlLines.push(`INSERT OR IGNORE INTO track_versions (id, track_id, version_name, preview_url, download_url, is_video, created_at) VALUES ${chunk.join(', ')};`);
  }

  fs.writeFileSync('import_external.sql', sqlLines.join('\n'));
  console.log(`Generated import_external.sql with ${tracksMap.size} unique tracks and ${versionsData.length} versions.`);
}

main().catch(console.error);
