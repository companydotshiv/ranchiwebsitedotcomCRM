BEGIN;

CREATE TABLE IF NOT EXISTS public.task_user_statuses (
  task_id bigint references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'todo',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (task_id, user_id)
);

ALTER TABLE public.task_user_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users on task_user_statuses" ON public.task_user_statuses;
CREATE POLICY "Allow all operations for authenticated users on task_user_statuses"
  ON public.task_user_statuses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add to Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_user_statuses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_user_statuses;
    END IF;
END
$$;

COMMIT;
