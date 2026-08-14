-- Run this in your Supabase SQL Editor to update vertical workflows from generic roles to specific users

-- 1. Drop the generic role_id
alter table public.vertical_workflow_steps drop column if exists role_id;

-- 2. Add specific user_id
alter table public.vertical_workflow_steps add column if not exists user_id uuid references public.profiles(id) on delete cascade not null;
