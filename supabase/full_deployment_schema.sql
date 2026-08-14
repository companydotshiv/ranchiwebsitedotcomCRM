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
-- Add date_of_birth column to profiles table
alter table public.profiles
add column if not exists date_of_birth date;
-- Create leave_types table
create table if not exists public.leave_types (
  id bigserial primary key,
  name text not null unique,
  description text,
  default_days_per_month integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.leave_types enable row level security;
create policy "Allow all operations for authenticated users on leave_types"
  on public.leave_types for all to authenticated using (true) with check (true);


-- Create leave_balances table
create table if not exists public.leave_balances (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  leave_type_id bigint references public.leave_types(id) on delete cascade not null,
  total_days integer not null default 0,
  used_days integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, leave_type_id)
);

alter table public.leave_balances enable row level security;
create policy "Allow all operations for authenticated users on leave_balances"
  on public.leave_balances for all to authenticated using (true) with check (true);

-- Create leave_requests table
create table if not exists public.leave_requests (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  leave_type_id bigint references public.leave_types(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  hr_comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.leave_requests enable row level security;
create policy "Allow all operations for authenticated users on leave_requests"
  on public.leave_requests for all to authenticated using (true) with check (true);

-- Create attendance_records table
create table if not exists public.attendance_records (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default CURRENT_DATE,
  sign_in_time timestamp with time zone not null default timezone('utc'::text, now()),
  photo_url text,
  location_lat double precision,
  location_lng double precision,
  location_address text,
  status text not null default 'present' check (status in ('present', 'late', 'half_day')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

alter table public.attendance_records enable row level security;
create policy "Allow all operations for authenticated users on attendance_records"
  on public.attendance_records for all to authenticated using (true) with check (true);

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

-- Create hr_departments table if it does not exist
create table if not exists public.hr_departments (
  id bigserial primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create attendance_policies table
create table if not exists public.attendance_policies (
  id bigserial primary key,
  late_time time not null default '09:30:00',
  half_day_time time not null default '11:00:00',
  late_violations_limit integer not null default 3,
  penalty_action text not null default 'mark_half_day' check (penalty_action in ('mark_half_day', 'mark_full_day', 'deduct_salary')),
  penalty_amount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.attendance_policies enable row level security;
create policy "Allow all operations for authenticated users on attendance_policies"
  on public.attendance_policies for all to authenticated using (true) with check (true);

-- Insert a default policy if none exists
insert into public.attendance_policies (late_time, half_day_time, late_violations_limit, penalty_action)
select '09:30:00', '11:00:00', 3, 'mark_half_day'
where not exists (select 1 from public.attendance_policies);

-- Create holidays table
create table if not exists public.holidays (
  id bigserial primary key,
  date date not null unique,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on holidays
alter table public.holidays enable row level security;
create policy "Allow all operations for authenticated users on holidays"
  on public.holidays for all to authenticated using (true) with check (true);

-- Create notifications table
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  is_read boolean default false,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on notifications
alter table public.notifications enable row level security;
create policy "Users can view their own notifications"
  on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users can update their own notifications"
  on public.notifications for update to authenticated using (auth.uid() = user_id);
create policy "System can insert notifications"
  on public.notifications for insert to authenticated with check (true);
create table if not exists public.task_audit_logs (
  id bigserial primary key,
  task_id bigint references public.tasks(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  field_name text not null,
  old_value text,
  new_value text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.task_audit_logs enable row level security;

drop policy if exists "Allow all operations for authenticated users on task_audit_logs" on public.task_audit_logs;
create policy "Allow all operations for authenticated users on task_audit_logs"
  on public.task_audit_logs for all to authenticated using (true) with check (true);

create or replace function public.log_task_updates()
returns trigger as $$
declare
  current_user_id uuid;
begin
  -- Get the current user who is making the change
  current_user_id := auth.uid();
  
  if old.title is distinct from new.title then
    insert into public.task_audit_logs (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, current_user_id, 'title', old.title, new.title);
  end if;
  
  if old.description is distinct from new.description then
    insert into public.task_audit_logs (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, current_user_id, 'description', old.description, new.description);
  end if;

  if old.status is distinct from new.status then
    insert into public.task_audit_logs (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, current_user_id, 'status', old.status, new.status);
  end if;

  if old.priority is distinct from new.priority then
    insert into public.task_audit_logs (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, current_user_id, 'priority', old.priority, new.priority);
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    insert into public.task_audit_logs (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, current_user_id, 'assigned_to', old.assigned_to::text, new.assigned_to::text);
  end if;

  if old.due_date is distinct from new.due_date then
    insert into public.task_audit_logs (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, current_user_id, 'due_date', old.due_date::text, new.due_date::text);
  end if;
  
  if old.start_date is distinct from new.start_date then
    insert into public.task_audit_logs (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, current_user_id, 'start_date', old.start_date::text, new.start_date::text);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_task_update on public.tasks;
create trigger on_task_update
  after update on public.tasks
  for each row execute procedure public.log_task_updates();
-- Enable Realtime for the required tables
-- First, drop the publication if it already exists (or we can just alter it)
-- Usually supabase_realtime publication is created by default in Supabase

BEGIN;

-- Ensure publication exists (it should by default in Supabase)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- Add all our custom tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.profiles,
  public.roles,
  public.user_roles,
  public.employees,
  public.verticals,
  public.vertical_workflow_steps,
  public.clients,
  public.teams,
  public.team_members,
  public.tasks,
  public.subtasks,
  public.task_comments,
  public.task_attachments,
  public.task_activity,
  public.notifications,
  public.attendance_policies,
  public.hr_attendance,
  public.mini_tasks;

COMMIT;
