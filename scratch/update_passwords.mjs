import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function generatePassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; ++i) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
}

async function main() {
  console.log('Fetching users...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listError) {
    console.error('Error fetching users:', listError);
    return;
  }

  console.log(`Found ${users.length} users. Generating new passwords...`);

  const results = [];

  for (const user of users) {
    const newPassword = generatePassword(16);
    
    console.log(`Updating password for ${user.email}...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error(`Failed to update ${user.email}:`, updateError);
    } else {
      results.push({ email: user.email, password: newPassword });
    }
  }

  const outputPath = path.resolve('scratch', 'new_passwords.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`Successfully updated ${results.length} passwords.`);
  console.log(`Passwords saved to ${outputPath}`);
}

main();
