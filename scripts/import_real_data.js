import fs from 'fs';
import path from 'path';

const csvPath = 'djflowerz-products.csv';
const outputFile = 'scripts/import_real_data.sql';

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

try {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const sql = [];

    // 1. Initial Data
    sql.push('-- Real Data Import for DJ Flowerz');
    sql.push('INSERT INTO product_types (id, name, has_variants, is_shipping_required, is_digital) VALUES (\'type_physical\', \'Physical Product\', 0, 1, 0) ON CONFLICT(id) DO NOTHING;');
    sql.push('INSERT INTO product_types (id, name, has_variants, is_shipping_required, is_digital) VALUES (\'type_digital\', \'Digital Track\', 0, 0, 1) ON CONFLICT(id) DO NOTHING;');

    const categories = new Set();
    const products = [];

    // Simple CSV parser for this specific format
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Extract fields handle quotes
        const fields = [];
        let currentField = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && line[j + 1] === '"') { // escaped quote
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

        const catName = category || 'Uncategorized';
        const catId = slugify(catName);
        categories.add({ id: catId, name: catName });

        products.push({
            id,
            name,
            description,
            price: parseFloat(price) || 0,
            category_id: catId,
            images: imagesStr ? JSON.parse(imagesStr.replace(/'/g, '"')) : [],
            inventory: parseInt(inventory) || 0,
            currency: currency || 'KES',
            is_active: is_active === '1' || is_active === 'true'
        });
    }

    // 2. Insert Categories
    for (const cat of categories) {
        const escapedName = cat.name.replace(/'/g, "''");
        sql.push(`INSERT INTO categories (id, name, slug) VALUES ('${cat.id}', '${escapedName}', '${cat.id}') ON CONFLICT(id) DO NOTHING;`);
    }

    // 3. Insert Products and Variants
    for (const p of products) {
        const escapedName = p.name.replace(/'/g, "''");
        const escapedDesc = (p.description || '').replace(/'/g, "''");
        let slug = slugify(p.name) + '-' + p.id.substring(0, 5);
        
        // Manual override for specific product requested by user
        if (p.id === 'p1771377823126') {
            slug = 'alphatheta-ddj-flx2-2-deck-dj-controller';
        }

        const imageUrl = p.images.length > 0 ? p.images[0] : '';

        sql.push(`INSERT INTO products_new (id, name, slug, description, category_id, product_type_id, is_active) VALUES ('${p.id}', '${escapedName}', '${slug}', '${escapedDesc}', '${p.category_id}', 'type_physical', ${p.is_active ? 1 : 0}) ON CONFLICT(id) DO NOTHING;`);

        sql.push(`INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, currency, image_url, metadata) VALUES ('${p.id}_v1', '${p.id}', 'Default', '${p.id}', ${p.price}, ${p.inventory}, '${p.currency}', '${imageUrl}', '${JSON.stringify(p.images).replace(/'/g, "''")}') ON CONFLICT(id) DO NOTHING;`);
    }

    fs.writeFileSync(outputFile, sql.join('\n') + '\n');
    console.log(`✅ Generated SQL import script: ${outputFile}`);

} catch (err) {
    console.error('Error processing CSV:', err);
}
