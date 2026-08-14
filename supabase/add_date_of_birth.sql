-- Add date_of_birth column to profiles table
alter table public.profiles
add column if not exists date_of_birth date;
