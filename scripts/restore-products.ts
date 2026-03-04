import fs from 'fs';
import path from 'path';

/**
 * Script to merge studio_equipment into products.json for the storefront.
 */
function mergeStudioEquipment() {
    const dataDir = path.join(process.cwd(), 'public/data');
    const productsPath = path.join(dataDir, 'products.json');
    const studioPath = path.join(dataDir, 'studio_equipment.json');

    if (!fs.existsSync(studioPath)) {
        console.error("studio_equipment.json not found");
        return;
    }

    const studioItems = JSON.parse(fs.readFileSync(studioPath, 'utf8'));
    let products = fs.existsSync(productsPath) ? JSON.parse(fs.readFileSync(productsPath, 'utf8')) : [];

    console.log(`Current products: ${products.length}`);
    console.log(`Studio items to potentialy merge: ${studioItems.length}`);

    let addedCount = 0;
    studioItems.forEach((item: any) => {
        const id = item.id || `studio_${Math.random().toString(36).substr(2, 9)}`;
        const name = item.name;

        // Skip placeholders
        if (!name || name === 'test' || name === 'Studio Monitor') return;

        // Check if already in products
        const exists = products.some((p: any) => p.name === name || p.id === id);

        if (!exists) {
            console.log(`Adding: ${name} (Category: ${item.category})`);
            products.push({
                id: id,
                name: name,
                description: item.description || `High-quality ${item.category} for your studio.`,
                price: item.price || 0,
                category: item.category === 'Stand' ? 'Accessory' : item.category || 'Audio',
                image: item.image || '',
                inventory: item.quantity || 5,
                is_active: true,
                is_featured: false,
                currency: 'KES',
                created_at: item.created_at || new Date().toISOString()
            });
            addedCount++;
        }
    });

    if (addedCount > 0) {
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
        console.log(`✅ Successfully added ${addedCount} studio items to products.json`);
    } else {
        console.log("No new studio items to add.");
    }
}

mergeStudioEquipment();
