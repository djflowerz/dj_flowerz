// scripts/sync-variants.js
// This script extracts variants from the products.variant_groups JSON and inserts them into product_variants.

import { execSync } from 'child_process';

const DB_NAME = "djflowerz-db";

async function sync() {
    console.log("Fetching products with variant data...");
    const cmd = `npx wrangler d1 execute ${DB_NAME} --command='SELECT id, variant_groups FROM products WHERE variant_groups IS NOT NULL AND variant_groups != "[]";' --remote --json`;
    
    let products;
    try {
        const output = execSync(cmd).toString();
        const response = JSON.parse(output);
        // Wrangler JSON output structure can vary, usually it's an array or has a results property
        products = response[0]?.results || response.results || [];
    } catch (e) {
        console.error("Failed to fetch products:", e.message);
        return;
    }

    console.log(`Processing ${products.length} products...`);
    
    for (const p of products) {
        try {
            const groups = JSON.parse(p.variant_groups);
            if (!Array.isArray(groups)) continue;

            for (const group of groups) {
                if (!group.variants || !Array.isArray(group.variants)) continue;

                for (const v of group.variants) {
                    const vid = v.id || `v${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    const vname = v.name || 'Default';
                    const vprice = v.price || v.discountPrice || 0;
                    const vcompare = v.compareAtPrice || v.discountPrice || 0;
                    const vinv = v.stock || v.inventory || 0;
                    const vimage = v.image_url || v.image || null;
                    const vsku = v.sku || null;

                    console.log(`Syncing variant [${vname}] for product [${p.id}]`);
                    
                    const insertCmd = `npx wrangler d1 execute ${DB_NAME} --command="INSERT OR IGNORE INTO product_variants (id, product_id, name, price, compare_at_price, inventory, image_url, sku) VALUES ('${vid}', '${p.id}', '${vname.replace(/'/g, "''")}', ${vprice}, ${vcompare}, ${vinv}, ${vimage ? `'${vimage}'` : 'NULL'}, ${vsku ? `'${vsku}'` : 'NULL'});" --remote`;
                    execSync(insertCmd);
                }
            }
        } catch (e) {
            console.error(`Error processing product ${p.id}:`, e.message);
        }
    }
    
    console.log("Sync complete!");
}

sync();
