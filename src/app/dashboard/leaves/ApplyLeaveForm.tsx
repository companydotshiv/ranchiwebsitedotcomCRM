'use client';

import { useState } from 'react';
import { applyForLeave } from '@/app/actions/leaves';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function ApplyLeaveForm({ leaveTypes }: { leaveTypes: any[] }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const typeId = parseInt(formData.get('typeId') as string);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const reason = formData.get('reason') as string;

    try {
      await applyForLeave(typeId, startDate, endDate, reason);
      (e.target as HTMLFormElement).reset();
      alert('Leave request submitted successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="typeId">Leave Type</Label>
        <select 
          id="typeId" 
          name="typeId" 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          <option value="">Select type...</option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date</Label>
        <Input type="date" id="startDate" name="startDate" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDate">End Date</Label>
        <Input type="date" id="endDate" name="endDate" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <textarea 
          id="reason" 
          name="reason" 
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Request
      </Button>
    </form>
  );
}
