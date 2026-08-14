import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_schema');
  console.log('Error?', error);
  // Alternative: just query information_schema if possible, but PostgREST doesn't allow it.
  // Instead, let's just insert a dummy record and see the type error if we pass an array to assigned_to.
  const { error: insertError } = await supabase.from('tasks').update({ assigned_to: ['uuid-1', 'uuid-2'] }).eq('id', 0);
  console.log('Update Error:', insertError);
}
check();
