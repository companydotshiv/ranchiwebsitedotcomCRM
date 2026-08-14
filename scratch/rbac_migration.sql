-- Add permissions jsonb column to public.roles table
alter table public.roles 
add column if not exists permissions jsonb default '{"manage_clients": false, "manage_tasks": true, "manage_users": false, "manage_settings": false}'::jsonb;

-- Update existing Administrator role to have all permissions
update public.roles
set permissions = '{"manage_clients": true, "manage_tasks": true, "manage_users": true, "manage_settings": true}'::jsonb
where name = 'Administrator';
