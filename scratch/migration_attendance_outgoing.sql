-- Add outgoing attendance columns to attendance_records

alter table public.attendance_records
  add column if not exists sign_out_time timestamp with time zone,
  add column if not exists sign_out_photo_url text,
  add column if not exists sign_out_location_lat numeric,
  add column if not exists sign_out_location_lng numeric,
  add column if not exists sign_out_location_address text;
