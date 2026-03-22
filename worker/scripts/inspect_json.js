import fs from 'fs';
const html = fs.readFileSync('/Users/DJFLOWERZ/.gemini/antigravity/scratch/dj_flowerz/worker/scripts/vicknick_home.html', 'utf8');
const startVar = 'const ALL_TRACKS = ';
const startIdx = html.indexOf(startVar);
const jsonStart = html.indexOf('[', startIdx);
const jsonEnd = html.indexOf('];', jsonStart) + 1;
const jsonStr = html.substring(jsonStart, jsonEnd);
const tracks = JSON.parse(jsonStr);
console.log("Total tracks:", tracks.length);
console.log("Sample keys:", tracks.slice(0, 10).map(t => t.key));
const locals = tracks.filter(t => t.key.startsWith('Locals'));
console.log("Locals tracks found:", locals.length);
if (locals.length > 0) {
    console.log("Locals sample:", locals.slice(0, 3).map(t => t.key));
}
