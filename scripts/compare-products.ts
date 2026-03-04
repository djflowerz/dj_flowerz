
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

async function compare() {
    console.log('Fetching local products...');
    const localPath = path.join(process.cwd(), 'public/data/products.json');
    if (!fs.existsSync(localPath)) {
        console.error('Local products.json not found');
        return;
    }
    const localProducts = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    console.log(`Local products: ${localProducts.length}`);

    console.log('Fetching Supabase products...');
    const { data: remoteProducts, error } = await supabase.from('products').select('*');
    if (error) {
        console.error('Error fetching Supabase products:', error);
        return;
    }
    console.log(`Supabase products: ${remoteProducts.length}`);

    const localIds = new Set(localProducts.map((p: any) => p.id));
    const remoteIds = new Set(remoteProducts.map((p: any) => p.id));

    const onlyInLocal = localProducts.filter((p: any) => !remoteIds.has(p.id));
    const onlyInRemote = remoteProducts.filter((p: any) => !localIds.has(p.id));

    console.log(`\nIDs Only in Local: ${onlyInLocal.length}`);
    if (onlyInLocal.length > 0) {
        console.log(onlyInLocal.map((p: any) => p.id).join(', '));
    }

    console.log(`IDs Only in Supabase: ${onlyInRemote.length}`);
    if (onlyInRemote.length > 0) {
        console.log(onlyInRemote.map((p: any) => p.id).join(', '));
    }

    // Compare common products
    let discrepancies = 0;
    localProducts.forEach((lp: any) => {
        const rp = remoteProducts.find((p: any) => p.id === lp.id);
        if (rp) {
            // Compare some key fields
            const fieldsToCompare = ['name', 'price', 'type', 'category'];
            fieldsToCompare.forEach(field => {
                if (lp[field] !== rp[field]) {
                    console.log(`Mismatch for product ${lp.id} (${lp.name}) on field ${field}:`);
                    console.log(`  Local: ${lp[field]}`);
                    console.log(`  Remote: ${rp[field]}`);
                    discrepancies++;
                }
            });
        }
    });

    if (discrepancies === 0 && onlyInLocal.length === 0 && onlyInRemote.length === 0) {
        console.log('\n✅ Data integrity verified! All products match.');
    } else {
        console.log(`\n❌ Found ${discrepancies} discrepancies and structural differences.`);
    }
}

compare().catch(console.error);
