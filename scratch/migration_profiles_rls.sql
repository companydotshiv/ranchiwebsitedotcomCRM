-- Drop existing select policy if it exists to avoid conflicts
drop policy if exists "Allow authenticated to view profiles" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;

-- Create policy to allow any logged in user to see all profiles (needed for the dropdowns)
create policy "Allow authenticated to view profiles"
  on public.profiles for select
  to authenticated
  using (true);
