-- Run this in the Supabase SQL Editor to link teams to the real auth users instead of the dummy table.

-- 1. Drop the old table that links to the dummy employees
DROP TABLE IF EXISTS public.team_members;

-- 2. Recreate it linking directly to the real user profiles
create table public.team_members (
  id bigserial primary key,
  team_id bigint references public.teams(id) on delete cascade,
  employee_id uuid references public.profiles(id) on delete cascade,
  parent_employee_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, employee_id)
);

-- 3. Enable RLS and setup policies
alter table public.team_members enable row level security;
create policy "Allow all operations for authenticated users on team_members"
  on public.team_members for all to authenticated using (true) with check (true);

-- 4. You can also drop the old employees table if you want, as it is no longer used!
-- DROP TABLE IF EXISTS public.employees;
