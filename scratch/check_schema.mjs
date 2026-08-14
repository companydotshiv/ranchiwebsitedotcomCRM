import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetch },
  realtime: { transport: ws }
});
async function run() {
  const { data, error } = await supabase.from('attendance_records').select('*').limit(1);
  if (data) console.log(Object.keys(data[0] || {}));
  else console.error(error);
}
run();
