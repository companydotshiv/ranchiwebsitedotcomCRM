-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  phone text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  date_of_birth date
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Create trigger function for new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Bind the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create storage bucket for avatars if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies for avatars
drop policy if exists "Public Access to Avatars" on storage.objects;
create policy "Public Access to Avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Allow Authenticated Uploads" on storage.objects;
create policy "Allow Authenticated Uploads"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'avatars' );

drop policy if exists "Allow Individual Updates" on storage.objects;
create policy "Allow Individual Updates"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "Allow Individual Deletions" on storage.objects;
create policy "Allow Individual Deletions"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- Create roles table
create table if not exists public.roles (
  id bigserial primary key,
  name text not null unique,
  description text,
  permissions jsonb default '{"manage_clients": false, "manage_tasks": true, "manage_users": false, "manage_settings": false}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on roles
alter table public.roles enable row level security;

drop policy if exists "Allow all operations for authenticated users on roles" on public.roles;
create policy "Allow all operations for authenticated users on roles"
  on public.roles for all
  to authenticated
  using (true)
  with check (true);

-- Create user_roles junction table
create table if not exists public.user_roles (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role_id bigint references public.roles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, role_id)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

drop policy if exists "Allow all operations for authenticated users on user_roles" on public.user_roles;
create policy "Allow all operations for authenticated users on user_roles"
  on public.user_roles for all
  to authenticated
  using (true)
  with check (true);

-- Create employees table
create table if not exists public.employees (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  phone text,
  role_id bigint references public.roles(id) on delete set null,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on employees
alter table public.employees enable row level security;

drop policy if exists "Allow all operations for authenticated users on employees" on public.employees;
create policy "Allow all operations for authenticated users on employees"
  on public.employees for all
  to authenticated
  using (true)
  with check (true);

-- Seed initial roles if empty
insert into public.roles (name, description, permissions)
values 
  ('Administrator', 'Full system access and settings management', '{"manage_clients": true, "manage_tasks": true, "manage_users": true, "manage_settings": true}'::jsonb),
  ('Sales Agent', 'Manage client accounts and sales pipelines', '{"manage_clients": true, "manage_tasks": false, "manage_users": false, "manage_settings": false}'::jsonb),
  ('Support Specialist', 'Handle customer inquiries and support tickets', '{"manage_clients": false, "manage_tasks": true, "manage_users": false, "manage_settings": false}'::jsonb)
on conflict (name) do nothing;

-- Create verticals table
create table if not exists public.verticals (
  id bigserial primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on verticals
alter table public.verticals enable row level security;

drop policy if exists "Allow all operations for authenticated users on verticals" on public.verticals;
create policy "Allow all operations for authenticated users on verticals"
  on public.verticals for all
  to authenticated
  using (true)
  with check (true);

-- Seed initial verticals
insert into public.verticals (name, description)
values 
  ('Sales', 'Sales operations and pipelines'),
  ('SMM', 'Social Media Management'),
  ('Ecommerce', 'E-commerce operations and storefronts'),
  ('Web/APP', 'Web and App development projects')
on conflict (name) do nothing;

-- Create clients table for Client Onboarding
create table if not exists public.clients (
  id bigserial primary key,
  client_name text not null,
  business_name text not null,
  business_logo_url text,
  links jsonb default '[]'::jsonb,
  phone_numbers jsonb default '[]'::jsonb,
  emails jsonb default '[]'::jsonb,
  poc_business jsonb default '[]'::jsonb,
  poc_our_side jsonb default '[]'::jsonb,
  pan text,
  gst text,
  cin text,
  website_link text,
  credentials jsonb default '{}'::jsonb,
  analytics jsonb default '{}'::jsonb,
  social_links jsonb default '{}'::jsonb,
  posting_frequency text,
  date_of_onboarding date,
  date_work_started date,
  date_work_stopped date,
  provided_services jsonb default '[]'::jsonb,
  industry text,
  products_services_offered text,
  target_location text,
  competitors text,
  usp text,
  business_goals jsonb default '[]'::jsonb,
  custom_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on clients
alter table public.clients enable row level security;

drop policy if exists "Allow all operations for authenticated users on clients" on public.clients;
create policy "Allow all operations for authenticated users on clients"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

-- Create storage bucket for client logos if it doesn't exist
insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do nothing;

-- Storage policies for client logos
drop policy if exists "Public Access to Client Logos" on storage.objects;
create policy "Public Access to Client Logos"
  on storage.objects for select
  using ( bucket_id = 'client-logos' );

drop policy if exists "Allow Authenticated Uploads to Client Logos" on storage.objects;
create policy "Allow Authenticated Uploads to Client Logos"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'client-logos' );

drop policy if exists "Allow Individual Updates to Client Logos" on storage.objects;
create policy "Allow Individual Updates to Client Logos"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'client-logos' );

drop policy if exists "Allow Individual Deletions to Client Logos" on storage.objects;
create policy "Allow Individual Deletions to Client Logos"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'client-logos' );

-- Create storage bucket for payment proofs if it doesn't exist
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Storage policies for payment proofs
drop policy if exists "Public Access to Payment Proofs" on storage.objects;
create policy "Public Access to Payment Proofs"
  on storage.objects for select
  using ( bucket_id = 'payment-proofs' );

drop policy if exists "Allow Authenticated Uploads to Payment Proofs" on storage.objects;
create policy "Allow Authenticated Uploads to Payment Proofs"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'payment-proofs' );

drop policy if exists "Allow Individual Updates to Payment Proofs" on storage.objects;
create policy "Allow Individual Updates to Payment Proofs"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'payment-proofs' );

drop policy if exists "Allow Individual Deletions to Payment Proofs" on storage.objects;
create policy "Allow Individual Deletions to Payment Proofs"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'payment-proofs' );

-- Create junction table for Clients and Verticals
create table if not exists public.client_verticals (
  client_id bigint references public.clients(id) on delete cascade,
  vertical_id bigint references public.verticals(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (client_id, vertical_id)
);

-- Enable RLS on client_verticals
alter table public.client_verticals enable row level security;

drop policy if exists "Allow all operations for authenticated users on client_verticals" on public.client_verticals;
create policy "Allow all operations for authenticated users on client_verticals"
  on public.client_verticals for all
  to authenticated
  using (true)
  with check (true);

-- Create client payments table
create table if not exists public.client_payments (
  id bigserial primary key,
  client_id bigint references public.clients(id) on delete cascade,
  payment_date date not null,
  transaction_number text,
  method text,
  proof_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.client_payments enable row level security;

drop policy if exists "Allow all operations for authenticated users on client_payments" on public.client_payments;
create policy "Allow all operations for authenticated users on client_payments"
  on public.client_payments for all
  to authenticated
  using (true)
  with check (true);
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

-- 3. Create Task Subtasks table
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

-- Enable RLS on Task Subtasks
alter table public.task_subtasks enable row level security;
create policy "Allow all operations for authenticated users on task_subtasks"
  on public.task_subtasks for all to authenticated using (true) with check (true);

-- Storage policies for attendance-photos
drop policy if exists "Public Access to Attendance Photos" on storage.objects;
create policy "Public Access to Attendance Photos"
  on storage.objects for select
  using ( bucket_id = 'attendance-photos' );

drop policy if exists "Allow Authenticated Uploads to Attendance Photos" on storage.objects;
create policy "Allow Authenticated Uploads to Attendance Photos"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'attendance-photos' );

drop policy if exists "Allow Individual Updates to Attendance Photos" on storage.objects;
create policy "Allow Individual Updates to Attendance Photos"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'attendance-photos' );

drop policy if exists "Allow Individual Deletions to Attendance Photos" on storage.objects;
create policy "Allow Individual Deletions to Attendance Photos"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'attendance-photos' );
