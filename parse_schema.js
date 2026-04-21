const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf-8'));
data[0].results.forEach(row => console.log(row.name + " (" + row.type + ")"));
