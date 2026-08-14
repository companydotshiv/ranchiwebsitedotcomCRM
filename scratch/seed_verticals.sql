-- Run this in your Supabase SQL Editor to ensure the 3 core verticals exist

INSERT INTO public.verticals (name, description)
VALUES 
  ('Finance', 'Core Finance Vertical for managing revenue, expenses, and profit margins.'),
  ('Sales', 'Core Sales Vertical for managing leads, pipelines, and conversions.'),
  ('HR', 'Core HR Vertical for managing headcount, open roles, and retention.')
ON CONFLICT DO NOTHING;
