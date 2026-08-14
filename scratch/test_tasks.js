require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }, realtime: { transport: ws }
});

async function run() {
  const { data: clients } = await supabase.from('clients').select('id').limit(1);
  const clientId = clients[0]?.id;

  if (clientId) {
    const { data, error } = await supabase.from('tasks').insert({
      title: 'test null due date',
      status: 'todo',
      ticket_id: 'TEST-' + Math.floor(Math.random() * 1000),
      priority: 'medium',
      client_id: clientId, 
      current_step_index: 0,
      color: 'slate',
      due_date: null
    }).select();
    
    console.log("Error:", error);
    console.log("Data:", data);
  } else {
    console.log("No clients found");
  }
}
run();
