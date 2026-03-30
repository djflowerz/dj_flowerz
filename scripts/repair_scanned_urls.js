import fs from 'node:fs';
import { execSync } from 'node:child_process';

const URL = 'scripts/broken_urls.json';

async function main() {
  console.log("Starting Scanned URL Repair based on exported JSON...");
  const rawData = fs.readFileSync(URL, 'utf-8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error("Error parsing JSON:", err);
    return;
  }
  
  const batch = data[0]?.results || [];
  
  if (batch.length === 0) {
    console.log("No broken scanned tracks found.");
    return;
  }
  
  console.log(`Building SQL for ${batch.length} tracks.`);
  
  const updates = [];
  for (const track of batch) {
    let rawPath = track.preview_url.replace('/mashups/', '');
    const encodedPath = rawPath.split('/').map(p => encodeURIComponent(p)).join('/');
    const correctUrl = `https://cdn.vicknickvideopool.com/${encodedPath}`;
    
    // Using single quotes everywhere for string replacement
    const safeUrl = correctUrl.replace(/'/g, "''");
    
    updates.push(`UPDATE track_versions SET preview_url = '${safeUrl}', download_url = '${safeUrl}' WHERE id = '${track.id}';`);
  }
  
  let repairSql = updates.join('\n');
  fs.writeFileSync('scripts/repair_scanned.sql', repairSql);
  
  console.log(`Generated ${updates.length} SQL update statements.`);
  console.log("Sample SQL:", updates[0]);
  
  console.log("Running repair_scanned.sql against D1...");
  try {
    execSync(`npx wrangler d1 execute djflowerz-db --remote --file scripts/repair_scanned.sql`, { encoding: 'utf-8' });
    console.log("Repair finished successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err.message);
  }
}

main().catch(console.error);
