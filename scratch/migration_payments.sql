-- Run this in the Supabase SQL Editor to add the payment-proofs bucket

-- Create storage bucket for payment proofs if it doesn't exist
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Storage policies for payment proofs
drop policy if exists "Public Access to Payment Proofs" on storage.objects;
create policy "Public Access to Payment Proofs"
  on storage.objects for select
  using ( bucket_id = 'payment-proofs' );

drop policy if exists "Allow Authenticated Uploads to Payment Proofs" on storage.objects;
create policy "Allow Authenticated Uploads to Payment Proofs"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'payment-proofs' );

drop policy if exists "Allow Individual Updates to Payment Proofs" on storage.objects;
create policy "Allow Individual Updates to Payment Proofs"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'payment-proofs' );

drop policy if exists "Allow Individual Deletions to Payment Proofs" on storage.objects;
create policy "Allow Individual Deletions to Payment Proofs"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'payment-proofs' );
