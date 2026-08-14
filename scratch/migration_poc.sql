-- Run this in your Supabase SQL Editor
ALTER TABLE public.clients DROP COLUMN poc_our_side;
ALTER TABLE public.clients DROP COLUMN poc_business;
ALTER TABLE public.clients ADD COLUMN poc_our_side jsonb default '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN poc_business jsonb default '[]'::jsonb;

-- Run this in your Supabase SQL Editor to create the task_subtasks table
create table if not exists public.task_subtasks (
  id bigserial primary key,
  task_id bigint references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean default false,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.task_subtasks enable row level security;
create policy "Allow all operations for authenticated users on task_subtasks"
  on public.task_subtasks for all to authenticated using (true) with check (true);

-- Run this if you already created the table without due_date
ALTER TABLE public.task_subtasks ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;
-- Run this if you already created the table without description
ALTER TABLE public.task_subtasks ADD COLUMN IF NOT EXISTS description text;
