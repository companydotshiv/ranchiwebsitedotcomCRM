import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, client:clients(id, business_name, vertical_id)')
    .limit(1);

  if (error) {
    console.error('Error with client alias:', error);
  } else {
    console.log('Success with client alias:', data);
  }
}
test();
