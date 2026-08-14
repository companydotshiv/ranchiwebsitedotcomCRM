-- Run this in the Supabase SQL Editor to add the onboarding fields to the clients table
-- and create the new client_payments table.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone_numbers jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emails jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS poc_business text,
  ADD COLUMN IF NOT EXISTS poc_our_side text,
  ADD COLUMN IF NOT EXISTS pan text,
  ADD COLUMN IF NOT EXISTS gst text,
  ADD COLUMN IF NOT EXISTS cin text,
  ADD COLUMN IF NOT EXISTS website_link text,
  ADD COLUMN IF NOT EXISTS credentials jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analytics jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS posting_frequency text,
  ADD COLUMN IF NOT EXISTS date_of_onboarding date,
  ADD COLUMN IF NOT EXISTS date_work_started date,
  ADD COLUMN IF NOT EXISTS date_work_stopped date,
  ADD COLUMN IF NOT EXISTS provided_services jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS products_services_offered text,
  ADD COLUMN IF NOT EXISTS target_location text,
  ADD COLUMN IF NOT EXISTS competitors text,
  ADD COLUMN IF NOT EXISTS usp text,
  ADD COLUMN IF NOT EXISTS business_goals jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_notes text;

-- Create client payments table
CREATE TABLE IF NOT EXISTS public.client_payments (
  id bigserial primary key,
  client_id bigint references public.clients(id) on delete cascade,
  payment_date date not null,
  transaction_number text,
  method text,
  proof_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users on client_payments" ON public.client_payments;
CREATE POLICY "Allow all operations for authenticated users on client_payments"
  ON public.client_payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
