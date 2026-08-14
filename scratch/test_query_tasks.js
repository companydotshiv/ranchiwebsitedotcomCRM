const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
  const { data, error } = await supabase.from('tasks').select('*, assigned_to:profiles(id, full_name)');
  console.log('Error:', error);
  console.log('Data:', data?.length);
}

testQuery();
