-- Run this in your Supabase SQL Editor to create the tables for the advanced Task Management system

-- 1. Create Tasks table
create table if not exists public.tasks (
  id bigserial primary key,
  ticket_id text unique not null,
  client_id bigint references public.clients(id) on delete cascade,
  vertical_id bigint references public.verticals(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  start_date timestamp with time zone,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Tasks
alter table public.tasks enable row level security;
create policy "Allow all operations for authenticated users on tasks"
  on public.tasks for all to authenticated using (true) with check (true);

-- 2. Create Task Comments table
create table if not exists public.task_comments (
  id bigserial primary key,
  task_id bigint references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Task Comments
alter table public.task_comments enable row level security;
create policy "Allow all operations for authenticated users on task_comments"
  on public.task_comments for all to authenticated using (true) with check (true);
