const fs = require('fs');

const SOURCES = [
  {
    name: 'Remix & Mashups Hub',
    file: 'remix_mashups.json',
    getGenre: (item) => item.key ? item.key.split('/')[1] || 'General' : 'General',
    getSubGenre: (item) => item.year || (item.key ? item.key.split('/')[1] || 'General' : 'General')
  },
  {
    name: 'Video Pool',
    file: 'vicknick_tracks.json',
    getGenre: (item) => item.month || item.year || 'General',
    getSubGenre: (item) => item.year || item.month || 'General'
  }
];

const tree = {};

for (const s of SOURCES) {
  if (!fs.existsSync(s.file)) continue;
  const data = JSON.parse(fs.readFileSync(s.file, 'utf8'));
  tree[s.name] = {};
  
  for (const item of data) {
    const g = s.getGenre(item).trim() || 'General';
    const sg = s.getSubGenre(item).trim() || 'General';
    
    if (!tree[s.name][g]) tree[s.name][g] = new Set();
    tree[s.name][g].add(sg);
  }
}

for (const hub in tree) {
  console.log('=' + hub.replace(/./g, '=') + '=');
  console.log('| ' + hub + ' |');
  console.log('=' + hub.replace(/./g, '=') + '=');
  for (const genre of Object.keys(tree[hub]).sort()) {
    const subs = Array.from(tree[hub][genre]).sort().join(', ');
    console.log(`📁 ${genre}`);
    console.log(`    ↳ Sub-Genres: [${subs}]`);
  }
  console.log();
}
