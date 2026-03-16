const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'migration_data/remix_source.html');
const content = fs.readFileSync(filePath, 'utf8');

// Match ALL_TRACKS = [...];
const match = content.match(/let\s+ALL_TRACKS\s*=\s*(\[[\s\S]*?\]);/);

if (match) {
  try {
    const tracks = JSON.parse(match[1]);
    fs.writeFileSync(path.join(__dirname, 'migration_data/remix_extracted.json'), JSON.stringify(tracks, null, 2));
    console.log(`Successfully extracted ${tracks.length} Remix tracks.`);
  } catch (err) {
    console.error('Error parsing ALL_TRACKS:', err);
  }
} else {
  console.error('ALL_TRACKS not found in remix_source.html');
}
