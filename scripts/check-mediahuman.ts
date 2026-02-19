
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkProduct() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%MediaHuman%');

    if (error) {
        console.error('Error fetching product:', error);
        return;
    }

    console.log('Product Data:', JSON.stringify(data, null, 2));
}

checkProduct();
