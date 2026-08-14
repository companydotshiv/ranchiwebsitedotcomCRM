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
