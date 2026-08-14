'use server';

import { createClient } from '@/lib/supabase/server';

export interface AttendancePolicy {
  id: number;
  late_time: string;
  half_day_time: string;
  late_violations_limit: number;
  penalty_action: string;
  penalty_amount: number | null;
}

export async function getAttendancePolicy(): Promise<AttendancePolicy | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attendance_policies')
    .select('*')
    .order('id', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching attendance policy:', error);
    return null;
  }
  return data;
}

export async function updateAttendancePolicy(policyData: Partial<AttendancePolicy>) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Ensure policy exists
  const existing = await getAttendancePolicy();
  
  if (existing) {
    const { error } = await supabase
      .from('attendance_policies')
      .update(policyData)
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('attendance_policies')
      .insert({
        late_time: policyData.late_time || '09:30:00',
        half_day_time: policyData.half_day_time || '11:00:00',
        late_violations_limit: policyData.late_violations_limit ?? 3,
        penalty_action: policyData.penalty_action || 'mark_half_day',
        penalty_amount: policyData.penalty_amount || null
      });
    if (error) throw new Error(error.message);
  }
}
