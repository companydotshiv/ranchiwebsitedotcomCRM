'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTodayUserAttendance } from '@/app/actions/attendance';

export function AttendanceHeaderButton() {
  const [timeAtWork, setTimeAtWork] = useState<string>('');

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['today_attendance'],
    queryFn: async () => {
      try {
        const record = await getTodayUserAttendance();
        return record;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    refetchInterval: 60000, // Refetch every minute just in case
  });

  useEffect(() => {
    if (!attendance || !attendance.sign_in_time || attendance.sign_out_time) {
      setTimeAtWork('');
      return;
    }

    const signInTime = new Date(attendance.sign_in_time).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = now - signInTime;

      if (diff < 0) return;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setTimeAtWork(formatted);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [attendance]);

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-slate-400 bg-slate-50 border-slate-100 shadow-sm mr-1 hidden sm:flex opacity-50" disabled>
        <Calendar className="w-3.5 h-3.5" />
        <span>Loading...</span>
      </Button>
    );
  }

  // Already completed shift for today
  if (attendance && attendance.sign_out_time) {
    return (
      <Link href="/dashboard/attendance/history">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 shadow-sm mr-1 hidden sm:flex">
          <Clock className="w-3.5 h-3.5" />
          <span>Shift Completed</span>
        </Button>
      </Link>
    );
  }

  // Currently at work
  if (attendance && !attendance.sign_out_time) {
    return (
      <Link href="/dashboard/attendance">
        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-bold text-white bg-rose-500 border-rose-600 hover:bg-rose-600 hover:text-white shadow-sm mr-1 hidden sm:flex">
          <span className="flex items-center gap-1.5 bg-rose-600 px-2 py-0.5 rounded text-[10px] font-mono shadow-inner border border-rose-700/50">
            <Clock className="w-3 h-3" />
            {timeAtWork}
          </span>
          <span className="flex items-center gap-1">
            Mark Outgoing <LogOut className="w-3.5 h-3.5 ml-0.5" />
          </span>
        </Button>
      </Link>
    );
  }

  // Not marked attendance yet
  return (
    <Link href="/dashboard/attendance">
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700 shadow-sm mr-1 hidden sm:flex">
        <Calendar className="w-3.5 h-3.5" />
        <span>Mark Attendance</span>
      </Button>
    </Link>
  );
}
