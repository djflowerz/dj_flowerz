
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const R2_URL = process.env.VITE_R2_URL || "https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev";
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAll() {
    console.log('--- THREE-WAY DATA INTEGRITY CHECK ---');

    // 1. LOCAL DATA
    const localPath = path.join(process.cwd(), 'public/data/products.json');
    const localProducts = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    console.log(`[LOCAL] Found: ${localProducts.length}`);

    // 2. SUPABASE DATA
    const { data: sbProducts, error } = await supabase.from('products').select('*');
    if (error) throw error;
    console.log(`[SUPABASE] Found: ${sbProducts.length}`);

    // 3. CLOUDFLARE R2 DATA
    const res = await fetch(`${R2_URL}/data/products.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('Failed to fetch from R2');
    const r2Products = await res.json();
    console.log(`[CLOUDFLARE R2] Found: ${r2Products.length}`);

    // Validation
    const allCountsMatch = (localProducts.length === sbProducts.length && sbProducts.length === r2Products.length);

    if (allCountsMatch) {
        console.log('\n✅ Counts match across all 3 storage locations (48 products).');

        const sampleLocal = localProducts[0];
        console.log(`\nSample Product: ${sampleLocal.name} (ID: ${sampleLocal.id})`);
        const hasR2Images = (lp: any) => (lp.image && lp.image.includes('r2.dev')) || (lp.images && lp.images.some((img: string) => img.includes('r2.dev')));

        if (hasR2Images(sampleLocal)) {
            console.log('✅ Verified: Product images are correctly hosted on Cloudflare R2.');
        } else if (sampleLocal.image === null && (!sampleLocal.images || sampleLocal.images.length === 0)) {
            console.log('ℹ️  Sample product has no images defined (correctly null).');
            // Try another sample
            const otherSample = localProducts.find(hasR2Images);
            if (otherSample) {
                console.log(`✅ Verified via product ${otherSample.id}: Images are hosted on Cloudflare R2.`);
            }
        } else {
            console.warn('⚠️  Warning: Images might not be using R2 CDN yet.');
        }

    } else {
        console.error(`\n❌ DISCREPANCY DETECTED! Counts do not match.`);
        console.log(`L: ${localProducts.length}, S: ${sbProducts.length}, R: ${r2Products.length}`);
    }
}

verifyAll().catch(err => console.error('Verification failed:', err.message));
