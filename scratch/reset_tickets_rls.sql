-- Run this in your Supabase SQL Editor to reset and fix the RLS for tickets

-- Drop all existing policies on direct_tickets to clear any conflicts
DROP POLICY IF EXISTS "Users can only view tickets they created or are assigned to" ON public.direct_tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.direct_tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.direct_tickets;
DROP POLICY IF EXISTS "Tickets are viewable by everyone in workspace" ON public.direct_tickets;

-- Create a single, robust ALL policy
CREATE POLICY "Allow all authenticated users full access to direct_tickets" 
ON public.direct_tickets
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
