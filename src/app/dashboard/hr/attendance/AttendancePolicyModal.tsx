'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAttendancePolicy, updateAttendancePolicy, AttendancePolicy } from '@/app/actions/attendance_policy';

export function AttendancePolicyModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [policy, setPolicy] = useState<Partial<AttendancePolicy>>({
    late_time: '09:30',
    half_day_time: '11:00',
    late_violations_limit: 3,
    penalty_action: 'mark_half_day',
    penalty_amount: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadPolicy();
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const data = await getAttendancePolicy();
      if (data) {
        // format times to HH:MM if they have seconds
        setPolicy({
          ...data,
          late_time: data.late_time.substring(0, 5),
          half_day_time: data.half_day_time.substring(0, 5)
        });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load policy');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // make sure to append seconds for Postgres time
      const dataToSave = {
        ...policy,
        late_time: policy.late_time?.length === 5 ? `${policy.late_time}:00` : policy.late_time,
        half_day_time: policy.half_day_time?.length === 5 ? `${policy.half_day_time}:00` : policy.half_day_time,
      };
      await updateAttendancePolicy(dataToSave);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            Attendance Policy Settings
          </CardTitle>
          <CardDescription>
            Configure rules for late attendance and automated penalties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  Policy saved successfully!
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Late After (Time)</label>
                  <Input 
                    type="time" 
                    value={policy.late_time} 
                    onChange={(e) => setPolicy({ ...policy, late_time: e.target.value })} 
                  />
                  <p className="text-[10px] text-slate-500">Employee marked 'late' after this time.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Half Day After (Time)</label>
                  <Input 
                    type="time" 
                    value={policy.half_day_time} 
                    onChange={(e) => setPolicy({ ...policy, half_day_time: e.target.value })} 
                  />
                  <p className="text-[10px] text-slate-500">Employee marked 'half day' after this time.</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-700">Monthly Violations</label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    min={0}
                    value={policy.late_violations_limit} 
                    onChange={(e) => setPolicy({ ...policy, late_violations_limit: parseInt(e.target.value) || 0 })} 
                    className="w-24"
                  />
                  <span className="text-sm text-slate-600">allowed late marks before penalty.</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-700">Penalty Action</label>
                <select 
                  className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  value={policy.penalty_action}
                  onChange={(e) => setPolicy({ ...policy, penalty_action: e.target.value })}
                >
                  <option value="mark_half_day">Convert to Half Day</option>
                  <option value="mark_full_day">Convert to Full Day Absent</option>
                  <option value="deduct_salary">Deduct Specific Amount</option>
                </select>

                {policy.penalty_action === 'deduct_salary' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Deduction Amount (₹)</label>
                    <Input 
                      type="number" 
                      min={0}
                      value={policy.penalty_amount || ''} 
                      onChange={(e) => setPolicy({ ...policy, penalty_amount: parseFloat(e.target.value) || null })} 
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2 bg-slate-50 py-3 rounded-b-xl border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Policy
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
