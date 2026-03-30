import { execSync } from 'node:child_process';
import { URL } from 'node:url';
import fs from 'node:fs';

function runD1(command) {
  try {
    const cmd = `npx wrangler d1 execute djflowerz-db --remote --command "${command.replace(/"/g, '\\"')}" --json`;
    const output = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'] // Capture both stdout and stderr
    });
    const result = JSON.parse(output);
    return result[0].results || [];
  } catch (error) {
    console.error(`D1 Error for command: ${command}`);
    if (error.stderr) console.error(`Stderr: ${error.stderr}`);
    if (error.stdout) console.error(`Stdout: ${error.stdout}`);
    return [];
  }
}

async function main() {
  console.log("Starting Music Pool Data Repair...");

  // 1. Fetch NULL, 'General', and Month-named tracks in batches to avoid ENOBUFS
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  let allTracks = [];
  let hasMore = true;
  let offset = 0;
  const limit = 500;
  const maxTracks = 60000;

  while (hasMore && offset < maxTracks) {
    console.log(`Fetching tracks (Offset: ${offset})...`);
    let batch = null;
    let retries = 0;
    while (retries < 3) {
      try {
        batch = runD1(`
          SELECT tracks.id, tracks.genre
          FROM tracks 
          JOIN track_versions ON tracks.id = track_versions.track_id 
          WHERE (track_versions.preview_url IS NULL OR track_versions.preview_url = '')
          AND tracks.id LIKE '%/%'
          GROUP BY tracks.id
          LIMIT ${limit} OFFSET ${offset};
        `);
        if (batch !== null) break;
      } catch (e) {
        console.warn(`Retry ${retries + 1} for offset ${offset}...`);
        retries++;
        if (retries === 3) throw e;
      }
    }
    
    if (!batch || batch.length === 0) break;
    
    // For these tracks, we derive the preview_url from the ID (which is the path)
    for (const track of batch) {
      if (track.id && track.id.includes('/')) {
        // Simple encoding for URL safety
        const safePath = track.id.split('/').map(p => encodeURIComponent(p)).join('/');
        track.preview_url = `https://remixandmashupshub.com/storage/${safePath}`;
      }
    }

    if (offset === 0 && batch.length > 0) {
       console.log("Sample track 0:", batch[0]);
    }

    allTracks = allTracks.concat(batch);
    offset += limit;
    if (batch.length < limit) break;
  }
  
  const tracks = allTracks;
  console.log(`Found ${tracks.length} tracks to process.`);

  const updates = [];
  const newGenres = new Set();

  for (const track of tracks) {
    if (!track.preview_url) continue;

    try {
      const urlString = track.preview_url;
      let path = '';
      if (urlString.startsWith('http')) {
        path = decodeURIComponent(new URL(urlString).pathname).substring(1);
      } else {
        path = decodeURIComponent(urlString);
      }
      
      const parts = path.split('/');

      if (parts.length >= 2) {
        let newGenre = 'General';
        const topDir = parts[0];
        const subDir = parts[1];

        if (topDir === 'Locals') newGenre = subDir;
        else if (topDir === 'Genres') newGenre = subDir;
        else if (topDir.includes('Video Pool Edits')) newGenre = subDir || topDir;
        else if (topDir.includes('Remix & Mashups Hub')) newGenre = subDir || topDir;
        else if (topDir.length > 4 && !MONTH_NAMES.includes(topDir) && !topDir.match(/^\d{4}$/)) {
          newGenre = topDir; 
        } else if (subDir && subDir.length > 3 && !MONTH_NAMES.includes(subDir)) {
          newGenre = subDir;
        }

        if (newGenre !== 'General' && newGenre !== track.genre) {
          updates.push({ id: track.id, genre: newGenre });
          newGenres.add(newGenre);
        }
      }
    } catch (e) {}
  }

  console.log(`Prepared ${updates.length} track updates and ${newGenres.size} new genres.`);
  let repairSql = '';

  // 1. Add new genres
  if (newGenres.size > 0) {
    const genreValues = Array.from(newGenres).map(g => {
      const id = g.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `('${id}', '${g.replace(/'/g, "''")}', 'General')`;
    }).join(',');
    repairSql += `INSERT OR IGNORE INTO genres (id, name, hub) VALUES ${genreValues};\n`;
  }

  // 2. Update Tracks
  if (updates.length > 0) {
    for (const u of updates) {
      repairSql += `UPDATE tracks SET genre = '${u.genre.replace(/'/g, "''")}' WHERE id = '${u.id.replace(/'/g, "''")}';\n`;
    }
  }

  // 3. Fix URLs in track_versions
  if (allTracks.length > 0) {
    console.log(`Generating URL updates for ${allTracks.length} tracks...`);
    let count = 0;
    for (const u of allTracks) {
      if (u.preview_url) {
        repairSql += `UPDATE track_versions SET preview_url = '${u.preview_url.replace(/'/g, "''")}', download_url = '${u.preview_url.replace(/'/g, "''")}' WHERE track_id = '${u.id.replace(/'/g, "''")}' AND (preview_url IS NULL OR preview_url = '');\n`;
        count++;
      }
    }
    console.log(`Generated ${count} URL update statements.`);
  }

  if (repairSql) {
    console.log(`repairSql length: ${repairSql.length} characters.`);
    fs.writeFileSync('scripts/fix_updates.sql', repairSql);
    console.log("Running fix_updates.sql against D1...");
    try {
      execSync(`npx wrangler d1 execute djflowerz-db --remote --file scripts/fix_updates.sql`, { encoding: 'utf-8' });
      console.log("Repair finished successfully.");
    } catch (err) {
      console.error("Error running SQL file:", err.message);
      if (err.stdout) console.error("Error stdout:", err.stdout);
      if (err.stderr) console.error("Error stderr:", err.stderr);
    }
  } else {
    console.log("No updates needed.");
  }
}

main().catch(console.error);
