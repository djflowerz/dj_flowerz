const fs = require('fs');
const path = require('path');

const csvPath = 'djflowerz-products.csv';
const productsPath = 'public/data/products.json';

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

try {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const products = [];

    // Simple CSV parser
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = [];
        let currentField = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && line[j + 1] === '"') {
                currentField += '"';
                j++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField);

        if (fields.length < 5) continue;

        const [id, name, description, price, category, imagesStr, inventory, currency, is_active] = fields;

        let slug = slugify(name);
        
        // Manual override for specific product to match user requested URL
        if (id === 'p1771377823126' || name.includes('DDJ-FLX2')) {
            slug = 'alphatheta-ddj-flx2-2-deck-dj-controller';
        }

        const images = imagesStr ? JSON.parse(imagesStr.replace(/'/g, '"')) : [];

        products.push({
            id,
            name,
            slug,
            description,
            shortDescription: description.substring(0, 160) + '...',
            price: parseFloat(price) || 0,
            category: category || 'Uncategorized',
            image: images[0] || '',
            images: images,
            stock: parseInt(inventory) || 0,
            currency: currency || 'KES',
            is_active: is_active === '1' || is_active === 'true',
            createdAt: new Date().toISOString()
        });
    }

    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    console.log(`✅ Successfully synced ${products.length} products to ${productsPath}`);

} catch (err) {
    console.error('Error processing CSV:', err);
}
