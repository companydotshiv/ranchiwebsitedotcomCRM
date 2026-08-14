import { getUserLeaveBalances, getUserLeaveRequests } from '@/app/actions/leaves';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LeavesPage() {
  const [balances, requests] = await Promise.all([
    getUserLeaveBalances(),
    getUserLeaveRequests()
  ]);

  return (
    <div className="w-full h-full p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xl uppercase tracking-widest border border-indigo-100 shadow-sm">
            Leave Management
          </span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm">View your leave balances and apply for time off.</p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Leave Balances</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {balances.map((b) => {
              const available = Math.max(0, b.balance.total_days - b.balance.used_days);
              return (
                <div key={b.type.id} className="relative group h-full overflow-hidden rounded-xl">
                  <div className="absolute top-3 -right-2 -bottom-2 -left-2 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
                  <div className="relative z-10 bg-white border border-slate-200 shadow-sm rounded-xl p-6 transition-all duration-300 h-full flex flex-col justify-center text-center">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{b.type.name}</p>
                    <div className="mt-4 flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-extrabold text-slate-800">{b.balance.used_days}</span>
                      <span className="text-xl font-medium text-slate-300">/</span>
                      <span className="text-4xl font-extrabold text-emerald-500">{available}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 mt-2 uppercase tracking-wide">
                      Taken / Remaining
                    </p>

                    {/* Hover Description Overlay */}
                    {b.type.description && (
                      <div className="absolute inset-0 bg-white/95 rounded-xl p-4 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2 tracking-widest">About this Leave</p>
                        <p className="text-sm text-slate-700 font-medium">{b.type.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Leave History</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">No leave requests found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">HR Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req, index) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{req.leave_types.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                          req.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={req.hr_comment || ''}>
                        {req.hr_comment || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
