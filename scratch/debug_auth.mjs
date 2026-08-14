import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws }
  }
);

async function run() {
  console.log("Fetching clients table...");
  const { data: clients, error: clientErr } = await supabase
    .from('clients')
    .select('id, client_name, business_name, emails, auth_user_id');
    
  if (clientErr) {
    console.error("Clients Table Error:", clientErr);
    return;
  }

  console.log(`Found ${clients.length} clients in 'clients' table:\n`);
  for (const client of clients) {
    console.log(`- ID: ${client.id}`);
    console.log(`  Client Name: ${client.client_name}`);
    console.log(`  Business Name: ${client.business_name}`);
    console.log(`  Emails (JSONB): ${JSON.stringify(client.emails)}`);
    console.log(`  Auth User ID: ${client.auth_user_id}`);
    
    if (client.auth_user_id) {
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(client.auth_user_id);
      if (user?.user) {
        console.log(`    Auth User Email: ${user.user.email}`);
        console.log(`    Auth User Confirmed: ${user.user.confirmed_at}`);
      } else {
        console.log(`    Auth User Error: User not found in auth.users (ID: ${client.auth_user_id})`);
      }
    } else {
      console.log(`    Auth User Link: NONE (auth_user_id is NULL)`);
    }
    console.log("-----------------------------------------");
  }
}

run();
