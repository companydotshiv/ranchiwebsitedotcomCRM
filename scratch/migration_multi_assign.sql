-- Create task_assignees junction table to support multiple assignments
create table if not exists public.task_assignees (
  task_id bigint references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- Enable RLS
alter table public.task_assignees enable row level security;

-- Policies for task_assignees
create policy "Allow all operations for authenticated users on task_assignees"
  on public.task_assignees for all to authenticated using (true) with check (true);

-- Backfill data: migrate existing single assignments into the junction table
insert into public.task_assignees (task_id, user_id)
select id, assigned_to
from public.tasks
where assigned_to is not null
on conflict do nothing;

-- Ensure tasks.assigned_to remains nullable if they want to keep the primary assignee there
-- This migration script doesn't drop the old column to maintain backward compatibility during transition.
