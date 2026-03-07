const { createClient } = require('@supabase/supabase-js');
const url = "https://yevqnoynsqidtplxggzs.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnFub3luc3FpZHRwbHhnZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjQ3ODAsImV4cCI6MjA4NzY0MDc4MH0.cb_79oC-RKNkhJBshhGw_tcFIVG50Wg6K0HIIK2Uyms";
const supabase = createClient(url, key);

async function run() {
    console.log("Searching for 'GoPro' or 'Green Lion' in Supabase...");

    const { data: products, error: pError } = await supabase
        .from('products')
        .select('*')
        .or('name.ilike.%GoPro%,name.ilike.%Green Lion%');

    if (pError) console.error("Error fetching products:", pError);
    else console.log("Products found:", products.length, products);

    const { data: equipment, error: eError } = await supabase
        .from('studio_equipment')
        .select('*')
        .or('name.ilike.%GoPro%,name.ilike.%Green Lion%');

    if (eError) console.error("Error fetching equipment:", eError);
    else console.log("Equipment found:", equipment.length, equipment);
}

run();
