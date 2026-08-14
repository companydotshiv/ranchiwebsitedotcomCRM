'use server';

import { createClient } from '@/lib/supabase/server';
import { getAttendancePolicy } from './attendance_policy';

export interface UserPenaltyStat {
  user_id: string;
  name: string;
  email: string;
  late_count: number;
  half_day_count: number;
  penalty_applied: string | null;
}

export async function getMonthlyPenaltyReport(year: number, month: number): Promise<UserPenaltyStat[]> {
  const supabase = await createClient();
  const policy = await getAttendancePolicy();
  
  if (!policy) return [];

  // Month is 1-indexed (1 = Jan, 12 = Dec)
  // Format to YYYY-MM-DD
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const endDateStr = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('user_id, status, profiles(full_name, email)')
    .gte('date', startDateStr)
    .lt('date', endDateStr);

  if (error || !records) {
    console.error('Error fetching records for report:', error);
    return [];
  }

  const userStats = new Map<string, UserPenaltyStat>();

  records.forEach((r: any) => {
    if (!userStats.has(r.user_id)) {
      userStats.set(r.user_id, {
        user_id: r.user_id,
        name: r.profiles?.full_name || 'Unknown',
        email: r.profiles?.email || '',
        late_count: 0,
        half_day_count: 0,
        penalty_applied: null
      });
    }
    const stat = userStats.get(r.user_id)!;
    if (r.status === 'late') stat.late_count++;
    if (r.status === 'half_day') stat.half_day_count++;
  });

  // Calculate penalties
  return Array.from(userStats.values()).map(stat => {
    if (stat.late_count > policy.late_violations_limit) {
      if (policy.penalty_action === 'mark_half_day') stat.penalty_applied = 'Converted to Half Day';
      else if (policy.penalty_action === 'mark_full_day') stat.penalty_applied = 'Converted to Full Day Absent';
      else if (policy.penalty_action === 'deduct_salary') stat.penalty_applied = `Salary Deduction: ₹${policy.penalty_amount || 0}`;
    }
    return stat;
  }).sort((a, b) => b.late_count - a.late_count);
}
