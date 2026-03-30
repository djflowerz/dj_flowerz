import { execSync } from 'node:child_process';
import fs from 'node:fs';

function runD1(command) {
  try {
    const cmd = `npx wrangler d1 execute djflowerz-db --remote --command "${command.replace(/"/g, '\\"')}" --json`;
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 });
    const result = JSON.parse(output);
    return result[0].results || [];
  } catch (error) {
    console.error(`D1 Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log("Repairing March 2026 Edits tracks...");

  // 1. Fetch all tracks that might be related to March 2026
  const tracks = runD1(`
    SELECT id, title, genre, collection_hub FROM tracks 
    WHERE id LIKE '%March 2026%' OR genre = 'General' OR genre IS NULL
  `);

  console.log(`Found ${tracks.length} tracks to inspect.`);
  let sql = "";

  for (const track of tracks) {
    if (!track.id) continue;

    // A. Fix Genre & Hub
    let newGenre = track.genre;
    let newHub = track.collection_hub || 'Edits';

    if (track.id.toLowerCase().includes('march 2026')) {
      newGenre = 'March 2026 Edits';
      newHub = 'Edits';
    }

    if (newGenre !== track.genre || newHub !== track.collection_hub) {
      sql += `UPDATE tracks SET genre = '${newGenre.replace(/'/g, "''")}', collection_hub = '${newHub.replace(/'/g, "''")}', display_genre = '${newGenre.replace(/'/g, "''")}' WHERE id = '${track.id.replace(/'/g, "''")}';\n`;
    }

    // B. Fix URLs (Preview/Download)
    // If the track is from the Remix Hub / Video Pool CDN
    if (track.id.includes('DJ FLOWERZ')) {
        const encodedPath = track.id.split('/').map(encodeURIComponent).join('/');
        const url = `https://cdn.vicknickvideopool.com/${encodedPath}`;
        sql += `UPDATE track_versions SET preview_url = '${url.replace(/'/g, "''")}', download_url = '${url.replace(/'/g, "''")}' WHERE track_id = '${track.id.replace(/'/g, "''")}';\n`;
    }
  }

  if (sql) {
    fs.writeFileSync('scripts/fix_march.sql', sql);
    console.log("Wrote scripts/fix_march.sql. Ready to execute.");
    // execSync(`npx wrangler d1 execute djflowerz-db --remote --file scripts/fix_march.sql`);
  } else {
    console.log("No repair needed.");
  }
}

main().catch(console.error);
