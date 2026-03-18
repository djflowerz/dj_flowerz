import fs from 'fs';
import crypto from 'crypto';

try {
  // Load data sources
  console.log("Loading data sources...");
  let vicknickData = [];
  try {
    vicknickData = JSON.parse(fs.readFileSync('vicknick_tracks.json', 'utf8'));
    console.log(`Loaded ${vicknickData.length} Vicknick tracks`);
  } catch (e) {
    console.log("No vicknick_tracks.json found or failed to parse.");
  }

  let remixData = [];
  try {
    remixData = JSON.parse(fs.readFileSync('remix_tracks_data.json', 'utf8'));
    console.log(`Loaded ${remixData.length} Remix Hub tracks`);
  } catch (e) {
    console.log("No remix_tracks_data.json found or failed to parse. Will test fetch if needed.");
  }

  if (vicknickData.length === 0 && remixData.length === 0) {
      console.error("No track data found to sync. Aborting.");
      process.exit(1);
  }

  const allTracksRaw = [...remixData, ...vicknickData];
  
  console.log(`Total raw tracks: ${allTracksRaw.length}`);

  // We need to group versions by Artist and Base Title
  // DB schema uses:
  // tracks: id, title, artist, display_genre, collection_hub, sub_genre, vibe, bpm, release_year, release_month, is_featured, is_active, created_at
  // track_versions: id, track_id, version_name, preview_url, download_url, file_size, is_main_version
  const groupedTracks = new Map();

  allTracksRaw.forEach((t) => {
    // --- NORMALIZE SCHEMA ---
    let rawTitle = t.baseTitle || t.title || '';
    let rawArtist = t.artist || 'Unknown Artist';
    let version = t.version || 'Original';
    let hub = t.year || 'Genres';
    let subGenre = t.month || 'Other';
    let type = t.type || 'audio';
    
    // Check if it's Remix Hub data (Remix Hub uses 'title' and 'previewLink')
    if (t.previewLink && !t.key) {
        hub = 'Remix & Mashups Hub';
        subGenre = t.artist; // For Remix Hub, 'artist' field is actually the folder/subgenre
        rawArtist = 'Unknown Artist'; // Reset to unknown to trigger parsing from title
    }

    const url = t.previewLink || (t.key ? 
             'https://' + (hub.includes('Remix') ? 'remix-and-mashups-worker.dennismacharia20.workers.dev' : 'r2.vicknickvideopool.com') + '/' + encodeURIComponent(t.key).replace(/%2F/g, '/') 
             : '');

    if (!url || url === 'https://') return;

    // --- EXTRACT BPM ---
    let bpm = 0;
    const bpmMatch = rawTitle.match(/(\d{2,3})\s?bpm/i) || (t.fileName && t.fileName.match(/(\d{2,3})\s?bpm/i));
    if (bpmMatch) {
        bpm = parseInt(bpmMatch[1]);
    }

    // --- RECENTNESS (NEW FLAG) ---
    const isNew = t.uploadedTime && (Date.now() - t.uploadedTime) < (14 * 24 * 60 * 60 * 1000); // 14 days

    // Remove "dj vicknick" branding and other cleanup
    let cleanTitle = rawTitle.replace(/dj\s*vicknick/gi, 'DJ Flowerz').trim();
    if (cleanTitle.startsWith('-')) cleanTitle = cleanTitle.substring(1).trim();
    
    // Clean up BPM from cleanTitle if it's there
    if (bpmMatch) {
        cleanTitle = cleanTitle.replace(bpmMatch[0], '').replace(/\(\s*\)/g, '').trim();
    }

    // Extract artist and base title
    let artist = rawArtist;
    let title = cleanTitle;

    // Better splitting logic if artist is unknown or looks like a folder
    if (artist === 'Unknown Artist' || artist.includes('Hub') || artist.includes('Remixes')) {
        if (cleanTitle.includes(' - ')) {
            const parts = cleanTitle.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        } else if (cleanTitle.includes('-')) {
            const parts = cleanTitle.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
        }
    }

    // Cleanup title from extra version info in parens
    title = title.replace(/\((Single|Acapella|Instrumental|Extended|Original|Dirty|Clean|Audio|Video)\)/gi, '').replace(/\s+-\s*$/, '').trim();
    
    // Assign generic rules for media types based on folder or type
    let trackType = type;
    if (subGenre.toUpperCase().includes('VIDEO') || hub.toUpperCase().includes('VIDEO') || url.endsWith('.mp4')) {
        trackType = 'video';
    }

    // Assign categories according to new lists
    let collectionHub = 'Genres'; // default
    if (hub === 'Remix & Mashups Hub' || hub === 'Remix') collectionHub = 'Remix & Mashups Hub';
    else if (hub.includes('202') && hub.includes('VIDEO')) collectionHub = hub;
    else if (hub === 'Riddimz F') collectionHub = "Riddimz F'";

    let displayGenre = subGenre;
    let vibe = 'Hype';
    if (subGenre.includes('Low Hype')) vibe = 'Low Hype';

    const groupKey = `${artist.toLowerCase().trim()}:::${title.toLowerCase().trim()}:::${collectionHub}`;

    if (!groupedTracks.has(groupKey)) {
        groupedTracks.set(groupKey, {
            id: crypto.randomUUID(),
            title: title || 'Untitled',
            artist: artist || 'Unknown Artist',
            display_genre: displayGenre,
            collection_hub: collectionHub,
            sub_genre: subGenre,
            vibe: vibe,
            bpm: bpm || 0,
            release_year: null,
            release_month: null,
            is_featured: isNew ? 1 : 0,
            is_active: 1,
            addedTime: t.uploadedTime || Date.now(),
            versions: []
        });
    }

    const parent = groupedTracks.get(groupKey);
    if (bpm > parent.bpm) parent.bpm = bpm;
    if (isNew) parent.is_featured = 1;

    // Add version
    const isDup = parent.versions.some(v => v.download_url === url);
    if (!isDup) {
        parent.versions.push({
            id: crypto.randomUUID(),
            version_name: version || (trackType === 'video' ? 'Video' : 'Original'),
            preview_url: url,
            download_url: url,
            file_size: null,
            is_main_version: parent.versions.length === 0 ? 1 : 0
        });
    }
  });


  console.log(`Reduced to ${groupedTracks.size} unique track groups.`);

  // Generate SQL
  console.log("Generating SQL mapping...");
  const sqlLines = [];
  
  // Transaction handled by wrangler d1 execute
  // sqlLines.push('BEGIN TRANSACTION;');

  let tCount = 0;
  let vCount = 0;

  for (const [key, track] of groupedTracks.entries()) {
      // Escape single quotes for SQL
      const esc = (str) => str ? str.toString().replace(/'/g, "''") : '';
      
      sqlLines.push(`INSERT OR IGNORE INTO tracks (id, title, artist, display_genre, collection_hub, sub_genre, vibe, bpm, release_year, release_month, is_featured, is_active) VALUES ('${track.id}', '${esc(track.title)}', '${esc(track.artist)}', '${esc(track.display_genre)}', '${esc(track.collection_hub)}', '${esc(track.sub_genre)}', '${esc(track.vibe)}', ${track.bpm}, ${track.release_year}, ${track.release_month ? `'${esc(track.release_month)}'` : 'NULL'}, ${track.is_featured}, ${track.is_active});`);
      tCount++;

      for (const v of track.versions) {
          sqlLines.push(`INSERT OR IGNORE INTO track_versions (id, track_id, version_name, preview_url, file_url, download_url, is_main_version) VALUES ('${v.id}', '${track.id}', '${esc(v.version_name)}', '${esc(v.preview_url)}', '${esc(v.preview_url)}', '${esc(v.download_url)}', ${v.is_main_version});`);
          vCount++;
      }
  }

  // sqlLines.push('COMMIT;');

  fs.writeFileSync('sync_tracks.sql', sqlLines.join('\n'));
  console.log(`Successfully wrote sync_tracks.sql with ${tCount} tracks and ${vCount} versions.`);


} catch (err) {
  console.error("Sync script failed:", err);
}

