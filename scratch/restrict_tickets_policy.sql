-- Run this in your Supabase SQL Editor to lock down ticket visibility

-- Drop the old overly permissive SELECT policy
DROP POLICY IF EXISTS "Tickets are viewable by everyone in workspace" ON public.direct_tickets;

-- Create the new restricted SELECT policy
CREATE POLICY "Users can only view tickets they created or are assigned to" 
ON public.direct_tickets
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  assigned_to = auth.uid()
);
