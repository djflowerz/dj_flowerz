
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncToSupabase() {
    console.log('Reading optimized local products...');
    const productsPath = path.join(process.cwd(), 'public/data/products.json');
    if (!fs.existsSync(productsPath)) {
        console.error('products.json not found');
        return;
    }

    const localProducts = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    console.log(`Syncing ${localProducts.length} products to Supabase...`);

    // We can upsert them all in one batch (Supabase handles up to a few thousand usually)
    const { error } = await supabase.from('products').upsert(localProducts, { onConflict: 'id' });

    if (error) {
        console.error('❌ Sync failed:', error);
    } else {
        console.log('✅ All products synced to Supabase successfully!');
    }
}

syncToSupabase().catch(err => console.error(err));
