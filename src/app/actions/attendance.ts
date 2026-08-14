'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markAttendance(
  photoUrl: string,
  locationLat: number | null,
  locationLng: number | null,
  locationAddress: string | null = null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  // Format current local time HH:MM:SS to compare with policy
  // NOTE: Server time is assumed to be the company's local time, or we just format to the same TZ if needed.
  // We'll use the user's local timezone from JS Date which runs on the server.
  const currentTimeStr = now.toTimeString().split(' ')[0];

  let calculatedStatus = 'present';

  // Fetch policy to check late/half day
  const { data: policy } = await supabase.from('attendance_policies').select('*').limit(1).single();

  if (policy) {
    if (currentTimeStr >= policy.half_day_time) {
      calculatedStatus = 'half_day';
    } else if (currentTimeStr >= policy.late_time) {
      calculatedStatus = 'late';
    }
  }

  const { error } = await supabase
    .from('attendance_records')
    .insert({
      user_id: user.id,
      date: today,
      photo_url: photoUrl,
      location_lat: locationLat,
      location_lng: locationLng,
      location_address: locationAddress,
      status: calculatedStatus,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Attendance already marked for today.');
    }
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/attendance');
  return { success: true };
}

export async function getDailyAttendance(date: string) {
  const supabase = await createClient();
  
  // We should ideally check if user is HR/Admin, but we rely on RLS/UI for now
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      *,
      profiles(full_name, avatar_url)
    `)
    .eq('date', date)
    .order('sign_in_time', { ascending: false });

  if (error) throw new Error(error.message);
  
  return data;
}

export async function getTodayOnlineUsers() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance_records')
    .select('user_id')
    .eq('date', today);

  if (error) return [];
  
  return data.map(record => record.user_id);
}

export async function getTodayUserAttendance() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, sign_in_time, status, photo_url, location_address, sign_out_time, sign_out_photo_url, sign_out_location_address')
    .eq('user_id', user.id)
    .eq('date', today)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching attendance:', error);
    return null;
  }

  return data;
}

export async function markOutgoingAttendance(
  photoUrl: string,
  locationLat: number | null,
  locationLng: number | null,
  locationAddress: string | null = null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  const { error } = await supabase
    .from('attendance_records')
    .update({
      sign_out_time: now.toISOString(),
      sign_out_photo_url: photoUrl,
      sign_out_location_lat: locationLat,
      sign_out_location_lng: locationLng,
      sign_out_location_address: locationAddress,
    })
    .eq('user_id', user.id)
    .eq('date', today);

  if (error) {
    console.error('Error marking outgoing attendance:', error);
    throw new Error('Failed to mark outgoing attendance');
  }

  revalidatePath('/dashboard/attendance');
  revalidatePath('/dashboard/hr/attendance');
  return true;
}

export async function getMyMonthlyAttendance(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Month is 1-indexed (1-12)
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching monthly attendance:', error);
    return [];
  }
  return data;
}

