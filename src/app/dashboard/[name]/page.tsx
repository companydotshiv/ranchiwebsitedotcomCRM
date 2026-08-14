'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MotionDiv, staggerContainer, fadeInUp } from '@/components/ui/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CalendarOff, Users, UserCog, Activity } from 'lucide-react';

export default function VerticalDashboardPage() {
  const params = useParams();
  const name = params.name as string;

  // Capitalize the first letter for display
  const verticalName = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Dashboard';
  const isHr = name?.toLowerCase() === 'hr';

  return (
    <div className="w-full h-full p-4 md:p-6 space-y-6">
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm uppercase tracking-widest border border-indigo-100 shadow-sm">
              {verticalName}
            </span>
            Command Center
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            Welcome to the {verticalName} overview. Use the quick links below to navigate to your daily operations.
          </p>
        </div>
      </div>

      <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Common Options */}
        <MotionDiv variants={fadeInUp}>
          <Link href="/dashboard/attendance" className="block group h-full relative">
            <div className="absolute top-3 -right-2 -bottom-2 -left-2 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
            <Card className="relative z-10 bg-white border border-slate-200 shadow-sm h-full transition-all duration-300">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="size-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">My Attendance</h3>
                  <p className="text-xs text-slate-500 mt-1">View your daily clock-ins and monthly attendance records.</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </MotionDiv>

        <MotionDiv variants={fadeInUp}>
          <Link href="/dashboard/leaves" className="block group h-full relative">
            <div className="absolute top-3 -right-2 -bottom-2 -left-2 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
            <Card className="relative z-10 bg-white border border-slate-200 shadow-sm h-full transition-all duration-300">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarOff className="size-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">My Leaves</h3>
                  <p className="text-xs text-slate-500 mt-1">Request time off and view your leave balances.</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </MotionDiv>

        {/* HR Exclusive Options */}
        {isHr && (
          <>
            <MotionDiv variants={fadeInUp}>
              <Link href="/dashboard/hr/attendance" className="block group h-full relative">
                <div className="absolute top-3 -right-2 -bottom-2 -left-2 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
                <Card className="relative z-10 bg-white border border-slate-200 shadow-sm h-full transition-all duration-300">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="size-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Manage Attendance</h3>
                      <p className="text-xs text-slate-500 mt-1">View team attendance, modify policies, and handle discrepancies.</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </MotionDiv>

            <MotionDiv variants={fadeInUp}>
              <Link href="/dashboard/hr/leaves" className="block group h-full relative">
                <div className="absolute top-3 -right-2 -bottom-2 -left-2 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
                <Card className="relative z-10 bg-white border border-slate-200 shadow-sm h-full transition-all duration-300">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="size-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserCog className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Manage Leaves</h3>
                      <p className="text-xs text-slate-500 mt-1">Approve or reject leave requests across the organization.</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </MotionDiv>
          </>
        )}
      </MotionDiv>

    </div>
  );
}
