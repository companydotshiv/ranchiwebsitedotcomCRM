-- Create the user_roles junction table
create table if not exists public.user_roles (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role_id bigint references public.roles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, role_id)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Drop existing policies if they exist (for idempotency)
drop policy if exists "Allow all operations for authenticated users on user_roles" on public.user_roles;

-- Create policy for user_roles
create policy "Allow all operations for authenticated users on user_roles"
  on public.user_roles for all
  to authenticated
  using (true)
  with check (true);

-- Optional: Migrate existing single roles from profiles to user_roles
-- Assuming workspace_role_id was previously used and still exists on profiles
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'workspace_role_id') then
    insert into public.user_roles (user_id, role_id)
    select id, workspace_role_id 
    from public.profiles 
    where workspace_role_id is not null
    on conflict (user_id, role_id) do nothing;
  end if;
end $$;
