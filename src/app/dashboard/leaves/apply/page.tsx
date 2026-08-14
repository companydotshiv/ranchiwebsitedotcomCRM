import { getLeaveTypes } from '@/app/actions/leaves';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ApplyLeaveForm from '../ApplyLeaveForm';

export default async function ApplyLeavePage() {
  const leaveTypes = await getLeaveTypes();

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Apply for Leave
          </h1>
          <p className="text-sm text-slate-500 mt-1">Submit a new leave request.</p>
        </div>
      </div>

      <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Leave Request Form</h2>
          <p className="text-slate-500 text-sm">Fill out the details below to apply for a leave.</p>
        </div>
        <ApplyLeaveForm leaveTypes={leaveTypes} />
      </div>
    </main>
  );
}
