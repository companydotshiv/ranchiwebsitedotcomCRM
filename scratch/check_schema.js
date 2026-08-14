require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }, realtime: { transport: ws }
});

async function checkSchema() {
  const { data, error } = await supabase.rpc('run_sql', { sql: "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'tasks';" });
  console.log(data, error);
}
checkSchema();
