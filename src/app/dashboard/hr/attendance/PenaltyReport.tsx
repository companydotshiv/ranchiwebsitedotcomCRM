'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getMonthlyPenaltyReport, UserPenaltyStat } from '@/app/actions/attendance_report';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function PenaltyReport() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserPenaltyStat[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getMonthlyPenaltyReport(year, month);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString('default', { month: 'long' });
  };

  return (
    <Card className="mt-6 border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b border-slate-100 rounded-t-xl">
        <div>
          <CardTitle className="text-slate-800">Monthly Penalty Report</CardTitle>
          <CardDescription>Review late marks and automated penalties for {getMonthName(month)} {year}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input 
            type="number" 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-24 bg-white"
          />
          <select 
            className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : stats.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No attendance records found for this month.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Employee</th>
                  <th className="px-6 py-4 font-bold text-center">Late Marks</th>
                  <th className="px-6 py-4 font-bold text-center">Half Days</th>
                  <th className="px-6 py-4 font-bold">Penalty Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((stat) => (
                  <tr key={stat.user_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{stat.name}</div>
                      <div className="text-[10px] text-slate-400">{stat.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center size-7 rounded-full font-bold ${stat.late_count > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                        {stat.late_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center size-7 rounded-full font-bold ${stat.half_day_count > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {stat.half_day_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {stat.penalty_applied ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                          <AlertTriangle className="size-3.5" />
                          {stat.penalty_applied}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                          <CheckCircle2 className="size-3.5" />
                          Good Standing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
