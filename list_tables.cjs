const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function listTables() {
  console.log("Listing tables from rpc...");
  // Try to use a common rpc if exists, or just query pg_catalog if allowed (usually not via postgrest)
  // Instead, let's try to query a few likely tables and see what works.
  
  const tables = ['profiles', 'users', 'products', 'mixtapes'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}' error:`, error.message);
    } else {
      console.log(`Table '${table}' found! Items:`, data.length);
    }
  }
}

listTables();
