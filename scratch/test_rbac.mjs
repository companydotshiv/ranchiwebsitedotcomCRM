import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = '514b913f-b6bd-4690-ac44-9fc414f81ec4'; // Shivendra Kumar
  
  const [tasksRes, subtasksRes, flowsRes] = await Promise.all([
    supabase.from('tasks').select('id, client_id, client:clients(vertical_id)').eq('assigned_to', userId),
    supabase.from('task_subtasks').select('task_id, task:tasks(client_id, client:clients(vertical_id))').eq('assigned_to', userId),
    supabase.from('vertical_workflow_steps').select('vertical_id').eq('user_id', userId)
  ]);
  
  console.log("Tasks:", JSON.stringify(tasksRes.data, null, 2));
  console.log("Subtasks:", JSON.stringify(subtasksRes.data, null, 2));
  console.log("Flows:", flowsRes.data);
}
run();
