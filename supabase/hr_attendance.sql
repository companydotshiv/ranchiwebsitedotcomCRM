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
