import { readFileSync, writeFileSync } from 'fs';

const csvContent = readFileSync('./original_products.csv', 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');
let sql = '';

for (let i = 1; i < lines.length; i++) {
  // Simple CSV parser for quotes
  const currentLine = lines[i];
  let inQuotes = false;
  let currentToken = '';
  const tokens = [];
  
  for (let j = 0; j < currentLine.length; j++) {
    const char = currentLine[j];
    if (char === '"' && currentLine[j+1] !== '"') {
      inQuotes = !inQuotes;
    } else if (char === '"' && currentLine[j+1] === '"') {
      currentToken += '"';
      j++; // skip escaped quote
    } else if (char === ',' && !inQuotes) {
      tokens.push(currentToken);
      currentToken = '';
    } else {
      currentToken += char;
    }
  }
  tokens.push(currentToken); // last token

  if (tokens.length < 5) continue;

  const id = tokens[0];
  const name = tokens[1].replace(/'/g, "''");
  const desc = tokens[2].replace(/'/g, "''");
  const price = parseFloat(tokens[3]) || 0;
  const category = tokens[4].replace(/'/g, "''");
  const inventory = parseInt(tokens[6]) || 10;
  const isActive = parseInt(tokens[7]) || 1;
  const isFeatured = parseInt(tokens[8]) || 0;
  const currency = tokens[9] || 'KES';
  const createdAt = tokens[10] || new Date().toISOString().replace('T', ' ').substring(0, 19);

  sql += `INSERT INTO products (id, name, description, price, category, inventory, is_active, is_featured, currency, created_at, updated_at) VALUES ('${id}', '${name}', '${desc}', ${price}, '${category}', ${inventory}, ${isActive}, ${isFeatured}, '${currency}', '${createdAt}', '${createdAt}') ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, price=excluded.price, is_active=excluded.is_active;\n`;
}

writeFileSync('./import_original_products.sql', sql);
console.log('Created import_original_products.sql');
