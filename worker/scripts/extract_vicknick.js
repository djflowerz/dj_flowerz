import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const html = fs.readFileSync(path.join(__dirname, 'vicknick_full.html'), 'utf8');

// Find the line that declares ALL_TRACKS
const lines = html.split('\n');
const trackLine = lines.find(l => l.includes('const ALL_TRACKS = ['));
if (!trackLine) {
  console.error('ALL_TRACKS not found in vicknick_locals.json');
  process.exit(1);
}

const jsonString = trackLine.split('const ALL_TRACKS = ')[1].replace(/;$/, '');
const tracks = JSON.parse(jsonString);

console.log(`Found ${tracks.length} tracks`);
console.log('Sample key:', tracks[0].key);
fs.writeFileSync(path.join(__dirname, 'vicknick_tracks.json'), JSON.stringify(tracks));
console.log('Written to vicknick_tracks.json');
