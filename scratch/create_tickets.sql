-- Run this in your Supabase SQL Editor

CREATE TABLE public.direct_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.direct_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone can read tickets they created or are assigned to (or all tickets if we want it open. The prompt says "anyone can raise and assign to anyone", let's allow all authenticated users to view all tickets for transparency, or restrict it. Let's make it visible to everyone in the workspace for simplicity, or just those involved.)
CREATE POLICY "Tickets are viewable by everyone in workspace" ON public.direct_tickets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert tickets" ON public.direct_tickets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can update tickets" ON public.direct_tickets
  FOR UPDATE USING (auth.role() = 'authenticated');
