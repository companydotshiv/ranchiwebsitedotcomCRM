-- Add auth_user_id to clients table to link them to their login accounts
alter table public.clients
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- Ensure clients have a specific role in profiles when they are created
-- (This will be handled by our API, but we want to make sure RLS lets them see their own client record)
drop policy if exists "Clients can view their own client record" on public.clients;
create policy "Clients can view their own client record"
  on public.clients for select
  using (auth.uid() = auth_user_id);

-- Tasks: Ensure clients can see tasks assigned to them and insert tickets
drop policy if exists "Clients can view their own tasks" on public.tasks;
create policy "Clients can view their own tasks"
  on public.tasks for select
  using (client_id in (select id from public.clients where auth_user_id = auth.uid()));

drop policy if exists "Clients can create tasks (tickets)" on public.tasks;
create policy "Clients can create tasks (tickets)"
  on public.tasks for insert
  with check (client_id in (select id from public.clients where auth_user_id = auth.uid()));
