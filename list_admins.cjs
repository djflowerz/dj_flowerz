const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function listAdmins() {
  console.log("Fetching admin profiles...");
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin');

  if (error) {
    console.error("Error fetching admins:", error);
  } else {
    console.log("Admin profiles found:", data);
  }
}

listAdmins();
