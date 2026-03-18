import fs from 'fs';

try {
    const html = fs.readFileSync('tmp_vicknick.html', 'utf8');
    
    // Search for array-like structures
    const match = html.match(/\[\s*\{\s*"year"/s) || html.match(/const\s+\w+\s*=\s*(\[.*?\]);/s) || html.match(/let\s+\w+\s*=\s*(\[.*?\]);/s);
    
    // We saw `"year":"Genres","month":"REGGAE VIDEOS"` in the data.
    // Let's just Regex out the whole array.
    const startIdx = html.indexOf('[{');
    const endIdx = html.lastIndexOf('}]');
    
    if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = html.substring(startIdx, endIdx + 2);
        const data = JSON.parse(jsonStr);
        console.log(`Successfully parsed JSON array with ${data.length} items`);
        fs.writeFileSync('vicknick_tracks.json', JSON.stringify(data, null, 2));
    } else {
        console.log("Could not find JSON array boundaries.");
    }
} catch (e) {
    console.error("Error:", e.message);
}
