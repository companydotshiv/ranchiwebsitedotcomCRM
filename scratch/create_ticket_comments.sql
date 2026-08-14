-- Run this in your Supabase SQL Editor to add the comments table

CREATE TABLE public.direct_ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.direct_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.direct_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Anyone can view ticket comments" 
ON public.direct_ticket_comments
FOR SELECT USING (auth.role() = 'authenticated');

-- Anyone can insert comments
CREATE POLICY "Anyone can insert ticket comments" 
ON public.direct_ticket_comments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
