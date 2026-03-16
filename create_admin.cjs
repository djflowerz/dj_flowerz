const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'antigravity_admin@example.com';
  const password = 'Temporary_Admin_Password_123!';
  
  console.log(`Checking if ${email} exists...`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError.message);
    return;
  }

  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    console.log("Admin user already exists. ID:", existingUser.id);
  } else {
    console.log("Creating new admin user...");
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });

    if (createError) {
      console.error("Error creating user:", createError.message);
      return;
    }
    console.log("User created successfully! ID:", data.user.id);

    // Also update the profile in the 'profiles' table (public schema)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: email,
        role: 'admin',
        name: 'Antigravity Admin'
      });

    if (profileError) {
      console.warn("Could not update public.profiles table (might not exist):", profileError.message);
    } else {
      console.log("Public profile updated successfully!");
    }
  }
}

createAdmin();
