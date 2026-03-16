const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'migration_data/vicknick_extracted.json');
try {
  const content = fs.readFileSync(filePath, 'utf8');
  const tracks = JSON.parse(content);
  console.log(`Total tracks: ${tracks.length}`);
  
  const hubs = [...new Set(tracks.map(t => t.year))];
  console.log('Unique Hubs:', hubs);
  
  const sample = tracks.slice(0, 3);
  console.log('Sample tracks:', JSON.stringify(sample, null, 2));
} catch (err) {
  console.error('Error:', err.message);
}
