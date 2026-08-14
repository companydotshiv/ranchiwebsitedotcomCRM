'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateLeaveRequestStatus, createLeaveType, deleteLeaveType, addHoliday, removeHoliday } from '@/app/actions/leaves';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths } from 'date-fns';

export default function LeaveManagement({ initialTypes, initialRequests, initialHolidays = [] }: { initialTypes: any[], initialRequests: any[], initialHolidays?: any[] }) {
  const [activeTab, setActiveTab] = useState<'requests' | 'policies' | 'holidays' | 'calendar'>('requests');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [holidayDate, setHolidayDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStartDate = startOfWeek(monthStart);
  const calendarEndDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStartDate, end: calendarEndDate });
  const approvedLeaves = initialRequests.filter((r) => r.status === 'approved');

  const handleAction = async (id: number, action: 'approved' | 'rejected') => {
    let comment = '';
    if (action === 'rejected') {
      const reason = prompt('Please provide a reason for rejection:');
      if (reason === null) return;
      comment = reason;
    } else {
      const note = prompt('Optional approval note:');
      if (note !== null) comment = note;
    }

    setProcessingId(id);
    try {
      await updateLeaveRequestStatus(id, action, comment);
      alert(`Request ${action} successfully.`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b">
        <button 
          className={`pb-2 px-4 ${activeTab === 'requests' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('requests')}
        >
          Leave Requests
        </button>
        <button 
          className={`pb-2 px-4 ${activeTab === 'policies' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('policies')}
        >
          Leave Policies
        </button>
        <button 
          className={`pb-2 px-4 ${activeTab === 'holidays' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('holidays')}
        >
          Holidays
        </button>
        <button 
          className={`pb-2 px-4 ${activeTab === 'calendar' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar View
        </button>
      </div>

      {activeTab === 'requests' && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Employee Requests</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialRequests.map((req, index) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 text-center font-medium text-slate-400">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {req.profiles?.avatar_url ? (
                          <img src={req.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full shadow-sm object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold shadow-sm">
                            {(req.profiles?.full_name || 'U')[0]}
                          </div>
                        )}
                        <span className="font-bold text-slate-700">{req.profiles?.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-600">{req.leave_types?.name}</td>
                    <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(req.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} <br/>
                      <span className="text-xs text-slate-400">to</span> {new Date(req.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 max-w-[200px] truncate text-slate-600" title={req.reason}>{req.reason}</td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                        req.status === 'rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 
                        'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-8 text-xs px-3 shadow-sm"
                            onClick={() => handleAction(req.id, 'approved')}
                            disabled={processingId === req.id}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold h-8 text-xs px-3 shadow-sm"
                            onClick={() => handleAction(req.id, 'rejected')}
                            disabled={processingId === req.id}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {initialRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-medium bg-slate-50/50">
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Leave Policies</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {initialTypes.map((t) => (
                <div key={t.id} className="relative group">
                  <div className="absolute top-2 -right-1 -bottom-1 -left-1 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-70 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
                  <div className="relative z-10 border border-slate-200 p-4 rounded-xl flex justify-between items-center bg-white shadow-sm transition-all duration-300">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-700">{t.name}</h3>
                      <p className="text-sm text-slate-500 font-medium">{t.description}</p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-3xl font-extrabold text-indigo-600">{t.default_days_per_month}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">days / yr</p>
                      </div>
                      <Button 
                        variant="destructive"
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 h-8 w-8 p-0 shrink-0 rounded-lg shadow-sm ml-2"
                        title="Delete Policy"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this policy? This might affect existing leave requests.')) {
                            try {
                              await deleteLeaveType(t.id);
                            } catch (e: any) {
                              alert('Could not delete policy. It may be in use by existing leave requests.');
                            }
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div>
              <div className="border border-slate-200 p-6 rounded-xl bg-white shadow-sm h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span>
                  Add New Policy
                </h3>
                <form action={async (formData) => {
                  await createLeaveType(
                    formData.get('name') as string,
                    formData.get('description') as string,
                    parseInt(formData.get('days') as string)
                  );
                }} className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Policy Name</label>
                    <Input name="name" required placeholder="e.g. Maternity Leave" className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
                    <Input name="description" required className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Default Days (Annually)</label>
                    <Input type="number" name="days" required min="0" className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500" />
                  </div>
                  <div className="flex-1 min-h-[1rem]"></div>
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 shadow-sm mt-2">Create Policy</Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'holidays' && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">National Holidays</h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            
            <div className="relative group">
              <div className="absolute top-2 -right-1 -bottom-1 -left-1 bg-[linear-gradient(90deg,#0ea5e9,#8b5cf6,#0ea5e9)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-60 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
              <div className="relative z-10 border border-slate-200 p-6 rounded-xl bg-white shadow-sm flex flex-col items-center transition-all duration-300">
                <h3 className="text-lg font-bold text-slate-800 mb-4 w-full flex items-center gap-2">
                  <span className="bg-sky-100 text-sky-600 p-1.5 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg></span>
                  Add Holiday
                </h3>
                <form action={async (formData) => {
                  if (!holidayDate) return alert('Please select a date');
                  await addHoliday(holidayDate, formData.get('name') as string);
                  alert('Holiday added successfully');
                }} className="space-y-4 w-full">
                  <div className="flex justify-center rounded-xl p-4 bg-slate-50 border border-slate-200 shadow-inner w-full overflow-x-auto">
                    <Calendar
                      mode="single"
                      selected={holidayDate}
                      onSelect={setHolidayDate}
                      className="bg-white rounded-lg shadow-sm border border-slate-100 [--cell-size:40px] sm:[--cell-size:45px] p-4 min-w-[320px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Holiday Name</label>
                    <Input name="name" required placeholder="e.g. Independence Day" className="bg-slate-50 border-slate-200 focus-visible:ring-sky-500" />
                  </div>
                  <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold h-10 shadow-sm mt-2">Add Holiday</Button>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700">Configured Holidays</h3>
              {initialHolidays.length === 0 ? (
                <div className="border border-dashed border-slate-300 p-8 rounded-xl text-center flex flex-col items-center justify-center bg-slate-50/50">
                  <span className="text-slate-400 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg></span>
                  <p className="text-sm text-slate-500 font-medium">No holidays configured yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {initialHolidays.map((h, idx) => (
                    <div key={h.id} className="border border-slate-200 p-4 rounded-xl flex justify-between items-center bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="text-center font-bold text-slate-400 text-sm w-4">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-700">{h.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold h-8 text-xs px-3 shadow-sm"
                        onClick={async () => {
                          if (confirm('Remove this holiday?')) {
                            await removeHoliday(h.id);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div>
          <div className="flex flex-row items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <h2 className="text-lg font-bold text-slate-900">HR Leave Calendar</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-9 w-9 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-indigo-600">
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="text-lg font-extrabold w-40 text-center text-slate-800 tracking-tight">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-9 w-9 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-indigo-600">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-7 border-b border-slate-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-3 text-center font-bold text-[10px] uppercase tracking-widest bg-slate-50 border-r last:border-r-0 border-slate-200 text-slate-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayLeaves = approvedLeaves.filter((req) => 
                  dayStr >= req.start_date && dayStr <= req.end_date
                );

                return (
                  <div key={idx} className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-colors ${isCurrentMonth ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/30 text-slate-400'}`}>
                    <p className={`text-sm font-bold mb-2 flex items-center justify-center w-7 h-7 rounded-full mx-auto ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}>
                      {format(day, 'd')}
                    </p>
                    <div className="space-y-1.5 mt-1 overflow-y-auto max-h-[90px] pr-1 custom-scrollbar">
                      {dayLeaves.map((req) => (
                        <div key={req.id} className="text-xs px-2 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-indigo-700 flex flex-col gap-0.5 shadow-sm hover:shadow hover:bg-indigo-100/80 transition-all cursor-default" title={`${req.profiles?.full_name || 'Unknown'} - ${req.leave_types?.name}`}>
                          <span className="font-extrabold truncate text-[11px]">{req.profiles?.full_name?.split(' ')[0] || 'User'}</span>
                          <span className="opacity-70 text-[9px] uppercase tracking-wider font-bold leading-none truncate">{req.leave_types?.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
