const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function testLogin() {
  const email = 'testadmin@example.com';
  const password = 'Admin_Password_123!';
  
  console.log(`Attempting login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login successful!");
    console.log("User ID:", data.user.id);
    console.log("Metadata:", data.user.user_metadata);
    
    // Check if we can fetch profiles
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (pError) {
      console.log("Profile fetch failed (expected if R2 only):", pError.message);
    } else {
      console.log("Profile found:", profile);
    }
  }
}

testLogin();
