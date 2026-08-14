'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// --- LEAVE TYPES / POLICIES (HR) ---

export async function getLeaveTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('leave_types').select('*').order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createLeaveType(name: string, description: string, defaultDays: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('leave_types').insert({
    name,
    description,
    default_days_per_month: defaultDays
  });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/hr/leaves');
}

export async function deleteLeaveType(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('leave_types').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/hr/leaves');
}
export async function updateLeaveType(id: number, name: string, description: string, defaultDays: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('leave_types').update({
    name,
    description,
    default_days_per_month: defaultDays
  }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/hr/leaves');
}

// --- LEAVE BALANCES (USER) ---

export async function getUserLeaveBalances() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // We should ideally ensure every user has balances generated based on leave_types.
  // For simplicity, we fetch all types and left join balances.
  const { data: types, error: typesError } = await supabase.from('leave_types').select('*');
  if (typesError) throw new Error(typesError.message);

  const { data: balances, error: balancesError } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('user_id', user.id);
  if (balancesError) throw new Error(balancesError.message);

  // Merge
  return types.map(type => {
    const balance = balances?.find(b => b.leave_type_id === type.id);
    return {
      type,
      balance: balance || { total_days: type.default_days_per_month, used_days: 0 }
    };
  });
}

// --- LEAVE REQUESTS (USER) ---

export async function applyForLeave(leaveTypeId: number, startDate: string, endDate: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('leave_requests').insert({
    user_id: user.id,
    leave_type_id: leaveTypeId,
    start_date: startDate,
    end_date: endDate,
    reason,
    status: 'pending'
  });

  if (error) throw new Error(error.message);

  // Notify Supervisor
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const { data: teamMember } = await supabase.from('team_members').select('parent_employee_id').eq('employee_id', user.id).single();
  
  if (teamMember && teamMember.parent_employee_id) {
    await supabase.from('notifications').insert({
      user_id: teamMember.parent_employee_id,
      message: `${profile?.full_name || 'A team member'} has applied for leave from ${startDate} to ${endDate}.`,
      link: '/dashboard/hr/leaves'
    });
  }

  revalidatePath('/dashboard/leaves');
}

export async function getUserLeaveRequests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, leave_types(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// --- LEAVE REQUESTS (HR) ---

export async function getAllLeaveRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      leave_types(name),
      profiles(full_name, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function updateLeaveRequestStatus(requestId: number, status: 'approved' | 'rejected', hrComment: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('leave_requests')
    .update({ status, hr_comment: hrComment, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  // If approved, update the balance
  if (status === 'approved') {
    const { data: request } = await supabase.from('leave_requests').select('*').eq('id', requestId).single();
    if (request) {
      // Calculate days
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive

      // Get or create balance
      const { data: balance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', request.user_id)
        .eq('leave_type_id', request.leave_type_id)
        .single();

      if (balance) {
        await supabase
          .from('leave_balances')
          .update({ used_days: balance.used_days + diffDays })
          .eq('id', balance.id);
      } else {
        // Need to create it with default days
        const { data: type } = await supabase.from('leave_types').select('default_days_per_month').eq('id', request.leave_type_id).single();
        await supabase.from('leave_balances').insert({
          user_id: request.user_id,
          leave_type_id: request.leave_type_id,
          total_days: type ? type.default_days_per_month : 0,
          used_days: diffDays
        });
      }
    }
  }

  revalidatePath('/dashboard/hr/leaves');
  revalidatePath('/dashboard/leaves');
}

// --- HOLIDAYS (HR) ---

export async function getHolidays() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('holidays').select('*').order('date');
  if (error) throw new Error(error.message);
  return data;
}

export async function addHoliday(date: Date, name: string) {
  const supabase = await createClient();
  // Ensure we just store the date part
  const dateString = date.toISOString().split('T')[0];
  const { error } = await supabase.from('holidays').insert({ 
    date: dateString, 
    name 
  });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/hr/leaves');
  revalidatePath('/dashboard/leaves');
}

export async function removeHoliday(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('holidays').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/hr/leaves');
  revalidatePath('/dashboard/leaves');
}

// --- GLOBAL LEAVE STATUS ---
export async function getUsersOnLeaveToday() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('leave_requests')
    .select('user_id')
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today);

  if (error) return [];
  return Array.from(new Set(data.map(d => d.user_id)));
}
