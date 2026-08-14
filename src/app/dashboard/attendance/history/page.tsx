'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMyMonthlyAttendance } from '@/app/actions/attendance';
import { Loader2, MapPin, Calendar, Clock, Image as ImageIcon, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AttendanceHistoryPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // 1-12
        const data = await getMyMonthlyAttendance(year, month);
        setRecords(data || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthYearString = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            My Attendance History
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review your sign-in and sign-out records per month.</p>
        </div>
        <Link href="/dashboard/attendance">
          <Button variant="outline">
            <Clock className="w-4 h-4 mr-2" /> Mark Attendance Today
          </Button>
        </Link>
      </div>

      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-lg text-slate-800">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {monthYearString}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth} disabled={isCurrentMonth}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">No Records Found</h3>
              <p className="text-slate-500 mt-1">You didn't mark attendance in {monthYearString}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map(record => {
                const recordDate = new Date(record.date).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
                
                return (
                  <div key={record.id} className="relative group">
                    <div className="absolute top-2 -right-1 -bottom-1 -left-1 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-[6px] transition-all duration-500 z-0"></div>
                    <div className="relative z-10 flex flex-col md:flex-row bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                    
                    {/* Date Block */}
                    <div className="bg-slate-50 p-3 md:w-32 shrink-0 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{new Date(record.date).toLocaleDateString('default', { weekday: 'short' })}</span>
                      <span className="text-2xl font-black text-slate-800 my-0.5">{new Date(record.date).getDate()}</span>
                      
                      {record.status && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          record.status === 'present' ? 'bg-green-100 text-green-700' :
                          record.status === 'late' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Incoming Section */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                          {record.photo_url ? (
                            <img src={record.photo_url} alt="Incoming" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 m-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="font-bold text-slate-800 text-sm">
                              Sign In <span className="text-slate-500 font-normal text-xs ml-1">at {new Date(record.sign_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </div>
                          {record.location_lat && (
                            <a href={`https://www.google.com/maps?q=${record.location_lat},${record.location_lng}`} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-xs text-slate-500 hover:text-emerald-600 hover:underline line-clamp-1">
                              <MapPin className="w-3 h-3 shrink-0 mt-[1px] text-emerald-500" />
                              {record.location_address || 'View Location'}
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* Outgoing Section */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          {record.sign_out_photo_url ? (
                            <img src={record.sign_out_photo_url} alt="Outgoing" className="w-full h-full object-cover" />
                          ) : (
                            <Clock className="w-5 h-5 m-3.5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                            <span className="font-bold text-slate-800 text-sm">
                              Sign Out 
                              {record.sign_out_time ? (
                                <span className="text-slate-500 font-normal text-xs ml-1">at {new Date(record.sign_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span className="text-slate-400 italic font-normal text-xs ml-1">Pending</span>
                              )}
                            </span>
                          </div>
                          {record.sign_out_location_lat && (
                            <a href={`https://www.google.com/maps?q=${record.sign_out_location_lat},${record.sign_out_location_lng}`} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-xs text-slate-500 hover:text-rose-600 hover:underline line-clamp-1">
                              <MapPin className="w-3 h-3 shrink-0 mt-[1px] text-rose-500" />
                              {record.sign_out_location_address || 'View Location'}
                            </a>
                          )}
                        </div>
                      </div>

                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </main>
  );
}
