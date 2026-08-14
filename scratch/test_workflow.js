// Quick test to verify workflow step advancement updates assigned_to correctly
// Run this in browser console on the CRM app

const { createClient } = await import('@supabase/supabase-js');

// Test: Fetch a task and its workflow steps, then verify the advance logic
async function testWorkflow() {
  const supabase = window.__SUPABASE_CLIENT__ || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // 1. Get a sample task
  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id, title, assigned_to, current_step_index, vertical_id, client_id')
    .limit(5);
  
  console.log('Sample tasks:', tasks);
  console.log('Task error:', taskErr);
  
  if (!tasks || tasks.length === 0) {
    console.log('No tasks found');
    return;
  }
  
  const task = tasks[0];
  console.log('Testing with task:', task);
  
  // 2. Get workflow steps for this task's vertical
  const { data: steps, error: stepErr } = await supabase
    .from('vertical_workflow_steps')
    .select('*, user:profiles(id, full_name)')
    .eq('vertical_id', task.vertical_id)
    .order('order_index', { ascending: true });
  
  console.log('Workflow steps:', steps);
  console.log('Steps error:', stepErr);
  
  if (!steps || steps.length === 0) {
    console.log('No workflow steps found for vertical:', task.vertical_id);
    return;
  }
  
  // 3. Check what the next step would be
  const currentIndex = task.current_step_index || 0;
  const nextIndex = currentIndex + 1;
  const nextStep = steps[nextIndex];
  
  console.log('Current step index:', currentIndex);
  console.log('Next step index:', nextIndex);
  console.log('Next step user:', nextStep?.user);
  console.log('Next step user_id:', nextStep?.user_id);
  
  if (!nextStep) {
    console.log('No next step available (already at last step)');
  }
}

testWorkflow();
