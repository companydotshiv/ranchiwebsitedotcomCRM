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
