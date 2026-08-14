import { getLeaveTypes, getAllLeaveRequests, getHolidays } from '@/app/actions/leaves';
import LeaveManagement from './LeaveManagement';

export default async function HRLeavesPage() {
  const [leaveTypes, requests, holidays] = await Promise.all([
    getLeaveTypes(),
    getAllLeaveRequests(),
    getHolidays()
  ]);

  return (
    <div className="w-full h-full p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xl uppercase tracking-widest border border-indigo-100 shadow-sm">
            HR Leave Management
          </span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm">Manage leave policies, employee requests, and holidays.</p>
      </div>

      <LeaveManagement initialTypes={leaveTypes} initialRequests={requests} initialHolidays={holidays} />
    </div>
  );
}
