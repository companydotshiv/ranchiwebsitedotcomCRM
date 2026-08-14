import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws }
  }
);

async function test() {
  console.log("Testing signInWithPassword with wrong credentials...");
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent-user-xyz@cinematickrs.in',
      password: 'wrongpassword123'
    });
    
    console.log("Result:", { data, error });
  } catch (err) {
    console.error("Caught error:", err);
  }
}

test();
