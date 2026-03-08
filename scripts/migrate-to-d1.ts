
import fs from 'fs';
import path from 'path';

/**
 * Migration Script: JSON to Cloudflare D1 SQL format
 */
async function migrateJsonToD1() {
    const dataDir = path.join(process.cwd(), 'public/data');
    const sqlFile = path.join(process.cwd(), 'supabase/cloudflare-d1-seed.sql');
    let sqlOutput = `-- DJ Flowerz D1 Data Seed Generated on ${new Date().toISOString()}\n\n`;

    // 1. PRODUCTS
    const productsPath = path.join(dataDir, 'products.json');
    if (fs.existsSync(productsPath)) {
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        sqlOutput += `-- Inserting ${products.length} products\n`;
        products.forEach((p: any) => {
            const id = p.id || `prod_${Math.random().toString(36).substr(2, 9)}`;
            const name = p.name?.replace(/'/g, "''");
            const desc = (p.description?.replace(/'/g, "''").replace(/\n/g, " ") || '').substring(0, 1000);
            const price = p.price || 0;
            const cat = p.category || 'General';
            const img = p.image?.startsWith('data:') ? '' : (p.image || '');

            sqlOutput += `INSERT OR REPLACE INTO products (id, name, description, price, category, image, is_active) VALUES ('${id}', '${name}', '${desc}', ${price}, '${cat}', '${img}', 1);\n`;
        });
        sqlOutput += "\n";
    }

    // 2. MIXTAPES
    const mixtapesPath = path.join(dataDir, 'mixtapes.json');
    if (fs.existsSync(mixtapesPath)) {
        const mixtapes = JSON.parse(fs.readFileSync(mixtapesPath, 'utf8'));
        sqlOutput += `-- Inserting ${mixtapes.length} mixtapes\n`;
        mixtapes.forEach((m: any) => {
            const id = m.id || m.title?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
            const title = m.title?.replace(/'/g, "''");
            const artist = m.artist?.replace(/'/g, "''") || 'DJ Flowerz';
            const genre = m.genre || 'General';
            const desc = (m.description?.replace(/'/g, "''").replace(/\n/g, " ") || '').substring(0, 1000);
            const cover = m.cover_url?.startsWith('data:') ? '' : (m.cover_url || '');
            const audio = m.audio_url?.startsWith('data:') ? '' : (m.audio_url || '');
            const download = m.download_url?.startsWith('data:') ? '' : (m.download_url || '');
            const tier = m.required_tier || 'free';
            const isFeatured = m.is_featured ? 1 : 0;
            const releaseDate = m.release_date || '';
            const duration = m.duration || '';
            const tags = Array.isArray(m.tags) ? m.tags.join(',') : (m.tags || '');

            sqlOutput += `INSERT OR REPLACE INTO mixtapes (id, title, artist, genre, description, cover_url, audio_url, download_url, required_tier, is_featured, release_date, duration, tags, cover_image) VALUES ('${id}', '${title}', '${artist}', '${genre}', '${desc}', '${cover}', '${audio}', '${download}', '${tier}', ${isFeatured}, '${releaseDate}', '${duration}', '${tags}', '${cover}');\n`;
        });
        sqlOutput += "\n";
    }

    // 3. SUBSCRIPTION PLANS
    const plansPath = path.join(dataDir, 'subscription_plans.json');
    if (fs.existsSync(plansPath)) {
        const plans = JSON.parse(fs.readFileSync(plansPath, 'utf8'));
        sqlOutput += `-- Inserting ${plans.length} subscription plans\n`;
        plans.forEach((p: any) => {
            const id = p.id;
            const name = p.name;
            const price = p.price || 0;
            const period = p.period || 'month';
            const features = JSON.stringify(p.features || []).replace(/'/g, "''");
            const link = p.link || '';

            sqlOutput += `INSERT OR REPLACE INTO subscription_plans (id, name, price, period, features, link, active) VALUES ('${id}', '${name}', ${price}, '${period}', '${features}', '${link}', 1);\n`;
        });
    }

    fs.writeFileSync(sqlFile, sqlOutput);
    console.log(`✅ SQL Seed file generated: ${sqlFile}`);
    console.log(`👉 Copy this to your Cloudflare Dashboard (D1 -> Console) to seed your database.`);
}

migrateJsonToD1().catch(err => console.error(err));
