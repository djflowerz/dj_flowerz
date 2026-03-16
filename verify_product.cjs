const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function verifyProduct() {
  console.log('Checking for product in Supabase...');
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('name', 'Neon Stealth Headset Case')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('Product NOT found.');
    } else {
      console.error('Error fetching product:', error);
    }
    return;
  }

  console.log('Product FOUND successfully:');
  console.log(JSON.stringify(data, null, 2));
}

verifyProduct().catch(console.error);
