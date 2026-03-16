const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function testLogin() {
  const email = 'ianmuriithiflowerz@gmail.com';
  const password = '@Ravin303#Wanjo';
  
  console.log(`Attempting login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login successful! User ID:", data.user.id);
  }
}

testLogin();
