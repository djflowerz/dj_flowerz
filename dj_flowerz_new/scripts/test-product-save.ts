
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testSaveProduct() {
    console.log('Testing saving a product with discount_price...');

    const testProduct = {
        id: 'test-p-' + Date.now(),
        name: 'Test Product ' + new Date().toISOString(),
        price: 1000,
        discount_price: 800,
        sale_price: 1200,
        description: 'Test description',
        category: 'Test',
        is_active: true,
        is_featured: false,
        inventory: 10,
        slug: 'test-product-' + Date.now()
    };

    const { data, error } = await supabase
        .from('products')
        .insert(testProduct)
        .select();

    if (error) {
        console.error('Error saving product:', error);
    } else {
        console.log('Successfully saved test product:', data);

        // Clean up
        const { error: delError } = await supabase
            .from('products')
            .delete()
            .eq('id', testProduct.id);

        if (delError) console.error('Error cleaning up test product:', delError);
        else console.log('Cleaned up test product.');
    }
}

testSaveProduct();
