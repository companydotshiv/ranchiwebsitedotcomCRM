import AttendanceView from './AttendanceView';
import { PenaltyReport } from './PenaltyReport';
import { getDailyAttendance } from '@/app/actions/attendance';

export default async function HRAttendancePage() {
  const today = new Date().toISOString().split('T')[0];
  // Fetch initial data for today
  const initialData = await getDailyAttendance(today);

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Daily Attendance Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">View attendance records, live photos, and geolocations.</p>
        </div>
      </div>

      <AttendanceView initialData={initialData} initialDate={today} />
      <PenaltyReport />
    </main>
  );
}
