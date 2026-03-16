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

async function updateAdminPassword() {
  const email = 'testadmin@example.com';
  const newPassword = 'Admin_Password_123!';
  
  console.log(`Checking if ${email} exists...`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError.message);
    return;
  }

  const existingUser = users.find(u => u.email === email);

  if (!existingUser) {
    console.log(`${email} does not exist. Creating it...`);
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });

    if (createError) {
      console.error("Error creating user:", createError.message);
      return;
    }
    console.log("User created successfully! ID:", data.user.id);
  } else {
    console.log(`Updating password for ${email}...`);
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError.message);
      return;
    }
    console.log("Password updated successfully!");
  }
}

updateAdminPassword();
