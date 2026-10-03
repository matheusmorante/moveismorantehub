const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '..', '.env.local');
const env = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  const email = env.NFE_HML_TEST_OPERATOR_EMAIL;
  const password = env.NFE_HML_TEST_OPERATOR_PASSWORD;

  console.log(`Checking user ${email}...`);

  let userToUpdate = null;

  // List users to find it
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users', listError);
    return;
  }

  const existingUser = users.users.find(u => u.email === email);
  if (existingUser) {
    console.log('User exists. Updating password...');
    userToUpdate = existingUser;
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password, email_confirm: true }
    );
    if (updateError) {
      console.error('Failed to update password', updateError);
      return;
    }
  } else {
    console.log('Creating user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' }, 
    });
    if (createError) {
      console.error('Failed to create user', createError);
      return;
    }
    userToUpdate = newUser.user;
  }

  console.log('User ID:', userToUpdate.id);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userToUpdate.id,
      role: 'admin',
      roles: ['admin', 'fiscal']
    });

  if (profileError) {
    console.error('Failed to update profile', profileError);
    return;
  }

  console.log('Test user ready.');
}

main();
