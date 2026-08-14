'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDailyAttendance } from '@/app/actions/attendance';
import { Loader2, MapPin, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttendancePolicyModal } from './AttendancePolicyModal';

export default function AttendanceView({ initialData, initialDate }: { initialData: any[], initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [records, setRecords] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const fetchAttendance = async (selectedDate: string) => {
    setDate(selectedDate);
    setLoading(true);
    try {
      const data = await getDailyAttendance(selectedDate);
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3">Select Date</h3>
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => fetchAttendance(e.target.value)}
            className="w-full bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      <div className="md:col-span-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Attendance Records
            <span className="bg-slate-200 text-slate-700 text-xs py-0.5 px-2 rounded-full font-bold">{records.length}</span>
          </h2>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
            <Button variant="outline" size="sm" onClick={() => setIsPolicyModalOpen(true)} className="bg-white">
              <Settings className="w-4 h-4 mr-2" />
              Policy Settings
            </Button>
          </div>
        </div>

        {records.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            <p>No attendance records found for this date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => {
              const time = new Date(record.sign_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              // Check if record date is today for online status
              const isToday = date === new Date().toISOString().split('T')[0];
              
              return (
                <div key={record.id} className="relative group">
                  <div className="absolute top-2 -right-1 -bottom-1 -left-1 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-[6px] transition-all duration-500 z-0"></div>
                  <div className="relative z-10 flex flex-col sm:flex-row gap-4 p-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                      {/* Photo Section */}
                      <div className="shrink-0 flex flex-col gap-2">
                        {record.photo_url ? (
                          <div className="w-24 h-24 rounded-lg overflow-hidden border bg-muted relative">
                            <img 
                              src={record.photo_url} 
                              alt="Sign-in capture" 
                              className="w-full h-full object-cover"
                            />
                            {record.sign_out_time && <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">IN</div>}
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                            No Photo
                          </div>
                        )}
                        
                        {record.sign_out_photo_url && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden border bg-muted relative">
                            <img 
                              src={record.sign_out_photo_url} 
                              alt="Sign-out capture" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">OUT</div>
                          </div>
                        )}
                      </div>

                      {/* Details Section */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">
                            {record.profiles?.full_name || 'Unknown User'}
                          </h3>
                          {isToday && !record.sign_out_time && (
                            <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              Online
                            </span>
                          )}
                          {isToday && record.sign_out_time && (
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Completed Shift
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          Signed in at <span className="font-medium text-foreground">{time}</span>
                          {record.sign_out_time && (
                            <> &bull; Signed out at <span className="font-medium text-foreground">{new Date(record.sign_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
                          )}
                        </p>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-500 w-16">Sign-In</span>
                            {record.location_lat && record.location_lng ? (
                              <a 
                                href={`https://www.google.com/maps?q=${record.location_lat},${record.location_lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <MapPin className="w-4 h-4 mr-1 shrink-0" />
                                <span className="truncate max-w-[250px]">{record.location_address || 'View Location'}</span>
                                <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground flex items-center">
                                <MapPin className="w-4 h-4 mr-1" /> Location not provided
                              </span>
                            )}
                          </div>
                          
                          {record.sign_out_time && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-slate-500 w-16">Sign-Out</span>
                              {record.sign_out_location_lat && record.sign_out_location_lng ? (
                                <a 
                                  href={`https://www.google.com/maps?q=${record.sign_out_location_lat},${record.sign_out_location_lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <MapPin className="w-4 h-4 mr-1 shrink-0" />
                                  <span className="truncate max-w-[250px]">{record.sign_out_location_address || 'View Location'}</span>
                                  <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-sm text-muted-foreground flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" /> Location not provided
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AttendancePolicyModal 
        isOpen={isPolicyModalOpen} 
        onClose={() => setIsPolicyModalOpen(false)} 
      />
    </div>
  );
}
