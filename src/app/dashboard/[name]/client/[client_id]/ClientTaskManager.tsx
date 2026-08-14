'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Table as TableIcon, Calendar as CalendarIcon, AlignLeft, Plus, X, MessageSquare, Clock, User as UserIcon, Loader2, ChevronLeft, ChevronRight, ListTodo, CheckCircle2, Trash2 } from 'lucide-react';
import { MotionDiv, fadeInUp } from '@/components/ui/motion';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { useOnLeaveUsers } from '@/hooks/useOnLeaveUsers';

type ViewType = 'calendar' | 'board' | 'table' | 'gantt';

type Task = {
  id: number;
  ticket_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  due_date: string;
  assigned_to: string;
  color?: string;
  vertical_id?: number;
  current_step_index?: number;
  assignee?: any;
};

export default function ClientTaskManager({ clientId, clientData }: { clientId: string, clientData: any }) {
  const [activeView, setActiveView] = useState<ViewType>('calendar');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialStartDate, setInitialStartDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: onLeaveUsers } = useOnLeaveUsers();
  const { data: currentUser } = useQuery({
    queryKey: ['current_user_role'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase.from('profiles').select('id, user_roles(role:roles(name))').eq('id', session.user.id).single();
      const roles = data?.user_roles?.map((ur: any) => ur.role?.name) || [];
      const isAdmin = roles.some((r: string) => ['Director', 'Associate Operational Manager', 'Senior Strategist'].includes(r));
      return { id: session.user.id, isAdmin };
    }
  });

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', clientId, currentUser?.id],
    queryFn: async () => {
      const { data: allTasks, error } = await supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name)').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching tasks:', error);
        return { allTasks: [], myTasks: [] };
      }
      
      let fetchedTasks = allTasks || [];
      
      const allTaskIds = fetchedTasks.map(t => t.id);
      let userStatuses: any[] = [];
      if (allTaskIds.length > 0) {
        const { data: usData } = await supabase.from('task_user_statuses').select('task_id, user_id, status').in('task_id', allTaskIds);
        userStatuses = usData || [];
      }
      
      fetchedTasks = fetchedTasks.map(t => {
        const targetUserId = currentUser?.id;
        const pStatus = userStatuses.find(s => s.task_id === t.id && s.user_id === targetUserId)?.status || t.status;
        return {
          ...t,
          status: pStatus
        };
      });

      if (!currentUser || currentUser.isAdmin) {
        return { allTasks: fetchedTasks, myTasks: fetchedTasks };
      }

      // Check if user has any subtasks
      const taskIds = fetchedTasks.map(t => t.id);
      const { data: subtasks } = taskIds.length > 0
        ? await supabase.from('task_subtasks').select('task_id, assigned_to').in('task_id', taskIds)
        : { data: [] };

      const mySubtasks = subtasks?.filter(s => s.assigned_to === currentUser.id) || [];
      const mySubtaskTaskIds = new Set(mySubtasks.map(s => s.task_id));

      const { data: assignments } = taskIds.length > 0
        ? await supabase.from('task_assignees').select('task_id').in('task_id', taskIds).eq('user_id', currentUser.id)
        : { data: [] };
      const myAssignmentTaskIds = new Set(assignments?.map(a => a.task_id) || []);

      const myTasks = fetchedTasks.filter(t => {
        const assignedId = t.assigned_to ? (typeof t.assigned_to === 'object' ? t.assigned_to.id : t.assigned_to) : null;
        return assignedId === currentUser.id || mySubtaskTaskIds.has(t.id) || myAssignmentTaskIds.has(t.id);
      });

      return { allTasks: fetchedTasks, myTasks };
    },
    enabled: !!currentUser
  });

  const tasks = tasksData?.myTasks || [];
  const allTasks = tasksData?.allTasks || [];

  const renderView = () => {
    if (isLoading) return <div className="p-3 flex justify-center"><Loader2 className="size-8 animate-spin text-slate-900" /></div>;

    switch (activeView) {
      case 'calendar':
        return <CalendarView key={clientData.id} tasks={allTasks} startDate={new Date()} onboardingDate={clientData.date_of_onboarding ? new Date(clientData.date_of_onboarding) : null} onTaskClick={setSelectedTask} onDayClick={(d) => { setInitialStartDate(d); setIsCreateModalOpen(true); }} />;
      case 'board':
        return <BoardView tasks={tasks} onTaskClick={setSelectedTask} />;
      case 'table':
        return <TableView tasks={tasks} onTaskClick={setSelectedTask} onLeaveUsers={onLeaveUsers} />;
      case 'gantt':
        return <GanttView tasks={tasks} onTaskClick={setSelectedTask} />;
      default:
        return null;
    }
  };

  // Ensure the modal always gets the freshest task data after a mutation
  const activeTask = selectedTask ? allTasks.find(t => t.id === selectedTask.id) || selectedTask : null;

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Header and View Switcher */}
      <MotionDiv variants={fadeInUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-white p-1.5 px-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-0.5 rounded-lg">
          <button onClick={() => setActiveView('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <CalendarIcon className="size-3.5" /> Calendar
          </button>
          <button onClick={() => setActiveView('board')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <LayoutDashboard className="size-3.5" /> Board
          </button>
          <button onClick={() => setActiveView('table')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <TableIcon className="size-3.5" /> Table
          </button>
          <button onClick={() => setActiveView('gantt')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'gantt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <AlignLeft className="size-3.5" /> Gantt
          </button>
        </div>
        
        {currentUser?.isAdmin && (
          <button onClick={() => { setInitialStartDate(null); setIsCreateModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
            <Plus className="size-3.5" /> Create Task
          </button>
        )}
      </MotionDiv>

      {/* Render Active View */}
      <MotionDiv variants={fadeInUp} className="w-full flex-1 flex flex-col mt-4">
        {renderView()}
      </MotionDiv>

      {isCreateModalOpen && <CreateTaskModal clientId={clientId} clientData={clientData} initialStartDate={initialStartDate} minDate={clientData.date_of_onboarding} onClose={() => setIsCreateModalOpen(false)} />}
      {activeTask && <TaskDetailModal task={activeTask} clientId={clientId} clientData={clientData} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}

// ----------------------------------------------------------------------
// Phase 3: Task Modals
// ----------------------------------------------------------------------
const CreateTaskModal = ({ clientId, clientData, initialStartDate, minDate, onClose }: { clientId: string, clientData: any, initialStartDate: Date | null, minDate?: string | null, onClose: () => void }) => {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate ? initialStartDate.toISOString().split('T')[0] : '');
  const [dueDate, setDueDate] = useState('');
  const [color, setColor] = useState('emerald');
  
  const COLORS = [
    { id: 'blue', class: 'bg-blue-500' },
    { id: 'emerald', class: 'bg-slate-900' },
    { id: 'purple', class: 'bg-purple-500' },
    { id: 'rose', class: 'bg-rose-500' },
    { id: 'amber', class: 'bg-amber-500' },
    { id: 'slate', class: 'bg-slate-500' }
  ];
  
  const mutation = useMutation({
    mutationFn: async () => {
      const ticketId = `TSK-${Math.floor(Math.random() * 10000)}`;
      const { data, error } = await supabase.from('tasks').insert({ 
        client_id: parseInt(clientId), 
        vertical_id: clientData?.vertical_id || null,
        current_step_index: 0,
        title, 
        ticket_id: ticketId, 
        status: 'todo', 
        priority: 'medium',
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        color
      }).select().single();

      if (error) throw error;

      if (data) {
        const { data: defaultMiniTasks, error: defaultsError } = await supabase
          .from('default_mini_tasks')
          .select('*')
          .order('order_index', { ascending: true });

        if (!defaultsError && defaultMiniTasks && defaultMiniTasks.length > 0) {
          const subtaskInserts = defaultMiniTasks.map((st: any) => ({
            task_id: data.id,
            title: st.title,
            description: st.description || null
          }));
          await supabase.from('task_subtasks').insert(subtaskInserts);
        } else if (defaultsError && defaultsError.code === '42P01') {
          // Fallback if table doesn't exist yet
          const fallbackMiniTasks = [
            { title: 'Type', description: 'Reel' },
            { title: 'Posting Date' },
            { title: 'Topic' },
            { title: 'Content' },
            { title: 'Caption' },
            { title: 'REFERENCE VIDEO / Graphic LINKS' },
            { title: 'Shoot Done?' },
            { title: 'Ads' },
            { title: 'Edited Post Link' },
            { title: 'Instagram Link' },
            { title: 'YouTube Long Link' },
            { title: 'YouTube Shorts Link' },
            { title: 'GMB Posting Link' },
            { title: 'Add Workflow Statuses' }
          ];

          const subtaskInserts = fallbackMiniTasks.map(st => ({
            task_id: data.id,
            title: st.title,
            description: st.description || null
          }));

          await supabase.from('task_subtasks').insert(subtaskInserts);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', clientId] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg">Create New Task</h3>
          <button onClick={onClose}><X className="size-5 text-slate-500" /></button>
        </div>
        <div className="p-3 space-y-2">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Task Title</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" placeholder="What needs to be done?" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Color Code</label>
            <div className="flex gap-2 mt-2">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`size-6 rounded-full border-2 transition-all ${color === c.id ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-105'} ${c.class}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
              <input type="date" min={minDate ? new Date(minDate).toISOString().split('T')[0] : undefined} value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Due Date</label>
              <input type="date" min={minDate ? new Date(minDate).toISOString().split('T')[0] : undefined} value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700" />
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
          <button onClick={onClose} className="px-3 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded-xl">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!title || mutation.isPending} className="px-3 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ----------------------------------------------------------------------
// 1. Calendar View (The full-width Google Calendar)
// ----------------------------------------------------------------------
const CalendarView = ({ tasks, startDate, onboardingDate, onTaskClick, onDayClick }: { tasks: Task[], startDate: Date, onboardingDate?: Date | null, onTaskClick: (t: Task) => void, onDayClick: (d: Date) => void }) => {
  const [currentDate, setCurrentDate] = useState(startDate);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => i);
  const remaining = Array.from({ length: (7 - ((padding.length + days.length) % 7)) % 7 }, (_, i) => i);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center p-3 md:p-3 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="size-6 text-slate-900" />
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Client Timeline Tracker</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="size-5 text-slate-600" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="size-5 text-slate-600" />
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-hidden w-full">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 auto-rows-[140px] bg-slate-200 gap-px border-b border-slate-200">
        {padding.map((_, i) => <div key={`pad-${i}`} className="bg-slate-50" />)}
        {days.map(day => {
          const currentCellDate = new Date(year, month, day);
          
          // Find tasks that overlap with this day
          const dayTasks = tasks.filter(t => {
            if (!t.start_date && !t.due_date) return false;
            const startStr = t.start_date || t.due_date;
            const endStr = t.due_date || t.start_date;
            const taskStart = new Date(startStr!);
            const taskEnd = new Date(endStr!);
            // Reset time portions for accurate day comparison
            taskStart.setHours(0,0,0,0);
            taskEnd.setHours(0,0,0,0);
            return currentCellDate >= taskStart && currentCellDate <= taskEnd;
          });

          const today = new Date();
          const isToday = currentCellDate.getDate() === today.getDate() && 
                          currentCellDate.getMonth() === today.getMonth() && 
                          currentCellDate.getFullYear() === today.getFullYear();

          const isOnboardingDate = onboardingDate && 
             onboardingDate.getDate() === day && 
             onboardingDate.getMonth() === month && 
             onboardingDate.getFullYear() === year;

          const isBeforeOnboarding = onboardingDate && currentCellDate < new Date(onboardingDate.getFullYear(), onboardingDate.getMonth(), onboardingDate.getDate());

          let bgClass = 'bg-white hover:bg-slate-50 cursor-pointer';
          if (isBeforeOnboarding) bgClass = 'bg-slate-50 cursor-not-allowed opacity-60';
          else if (isToday) bgClass = 'bg-blue-50/50 hover:bg-blue-50/80 cursor-pointer ring-1 ring-inset ring-blue-500 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]';
          else if (isOnboardingDate) bgClass = 'bg-indigo-50/30 hover:bg-indigo-50/50 cursor-pointer';

          return (
            <div key={day} onClick={() => !isBeforeOnboarding && onDayClick(currentCellDate)} className={`relative p-2 transition-all duration-200 group flex flex-col h-full overflow-y-auto custom-scrollbar ${bgClass}`}>
              <div className="flex items-start justify-between mb-1 z-10">
                <span className={`inline-flex items-center justify-center size-8 rounded-full text-sm font-bold ${
                  isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-2 ring-blue-600 ring-offset-1' : 
                  isOnboardingDate ? 'bg-indigo-600 text-white' : 
                  'text-slate-700 group-hover:bg-slate-200/50'
                }`}>
                  {day}
                </span>
                <div className="flex flex-col gap-1 items-end">
                  {isToday && (
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100 px-1.5 py-0.5 rounded-md border border-blue-200 shadow-sm">Today</span>
                  )}
                  {isOnboardingDate && (
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-1.5 py-0.5 rounded-md border border-indigo-200">Onboarded</span>
                  )}
                </div>
              </div>
              <div className="relative z-20 space-y-0.5">
                {dayTasks.map(t => {
                  const isStart = t.start_date && new Date(t.start_date).getDate() === day && new Date(t.start_date).getMonth() === month;
                  const isEnd = t.due_date && new Date(t.due_date).getDate() === day && new Date(t.due_date).getMonth() === month;
                  const spansMultiple = t.start_date && t.due_date && new Date(t.start_date).getTime() !== new Date(t.due_date).getTime();

                  let styling = "rounded-md";
                  let margins = "mx-0";

                  if (spansMultiple) {
                    if (isStart) {
                      styling = "rounded-l-md rounded-r-none border-r-0";
                      margins = "ml-0 -mr-2"; // Push through the right padding
                    } else if (isEnd) {
                      styling = "rounded-r-md rounded-l-none border-l-0";
                      margins = "-ml-2 mr-0"; // Pull through the left padding
                    } else {
                      styling = "rounded-none border-x-0";
                      margins = "-mx-2"; // Span full width
                    }
                  }

                  let sizeClasses = "px-1.5 py-0.5 text-[10px] leading-[14px]";
                  if (dayTasks.length > 4) {
                    sizeClasses = "px-1 py-0 text-[9px] leading-[12px]";
                  }

                  const COLOR_MAP: Record<string, string> = {
                    blue: 'bg-blue-500 border-blue-600 hover:bg-blue-600',
                    emerald: 'bg-slate-900 border-emerald-600 hover:bg-slate-900',
                    purple: 'bg-purple-500 border-purple-600 hover:bg-purple-600',
                    rose: 'bg-rose-500 border-rose-600 hover:bg-rose-600',
                    amber: 'bg-amber-500 border-amber-600 hover:bg-amber-600',
                    slate: 'bg-slate-500 border-slate-600 hover:bg-slate-600',
                  };
                  const taskTheme = COLOR_MAP[t.color || 'emerald'] || COLOR_MAP['emerald'];

                  return (
                    <div 
                      key={t.id} 
                      onClick={(e) => { e.stopPropagation(); onTaskClick(t); }} 
                      className={`${sizeClasses} ${taskTheme} text-white font-bold border shadow-sm cursor-pointer truncate transition-colors ${styling} ${margins}`}
                    >
                      {isStart || !spansMultiple ? `${t.ticket_id}: ${t.title}` : '\u00A0'}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {remaining.map((_, i) => <div key={`pad-end-${i}`} className="bg-slate-50" />)}
        </div>
      </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. Board View (Kanban)
// ----------------------------------------------------------------------
const getDeadlineInfo = (dueDate: string | null) => {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  const now = new Date().getTime();
  const diff = due - now;

  if (diff < 0) return { text: 'Overdue', color: 'text-red-600 bg-red-50 border-red-100' };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 7) return null; // Only show if deadline is within 1 week

  if (days === 7) return { text: '1 week till deadline', color: 'text-slate-600 bg-slate-50 border-slate-200' };
  if (days >= 1) return { text: `${days} day${days > 1 ? 's' : ''} till deadline`, color: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (hours >= 1) return { text: `${hours} hour${hours > 1 ? 's' : ''} till deadline`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
  return { text: '< 1 hour till deadline', color: 'text-red-600 bg-red-50 border-red-200' };
};

const BoardView = ({ tasks, onTaskClick }: { tasks: Task[], onTaskClick: (t: Task) => void }) => {
  const columns = [
    { id: 'todo', label: 'To Do', color: 'slate' },
    { id: 'in_progress', label: 'In Progress', color: 'blue' },
    { id: 'review', label: 'Review', color: 'amber' },
    { id: 'done', label: 'Done', color: 'emerald' }
  ];

  const COLOR_MAP: Record<string, { border: string, dot: string, hoverText: string }> = {
    slate: { border: 'border-l-slate-400 hover:border-slate-500', dot: 'bg-slate-400', hoverText: 'group-hover:text-slate-600' },
    blue: { border: 'border-l-blue-400 hover:border-blue-500', dot: 'bg-blue-400', hoverText: 'group-hover:text-blue-600' },
    amber: { border: 'border-l-amber-400 hover:border-amber-500', dot: 'bg-amber-400', hoverText: 'group-hover:text-amber-600' },
    emerald: { border: 'border-l-emerald-400 hover:border-slate-500', dot: 'bg-emerald-400', hoverText: 'group-hover:text-slate-900' }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1 custom-scrollbar min-h-[500px]">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        const theme = COLOR_MAP[col.color] || COLOR_MAP.slate;

        return (
          <div key={col.id} className="flex-1 min-w-[280px] flex-shrink-0 bg-slate-100/50 rounded-xl border border-slate-200 flex flex-col">
            <div className="p-3 border-b border-slate-200/50 flex items-center justify-between bg-slate-100/80 rounded-t-2xl">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${theme.dot}`} />
                {col.label}
              </h3>
              <span className="bg-white text-slate-500 text-xs font-bold px-2 py-1 rounded-md shadow-sm">{colTasks.length}</span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {colTasks.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl h-24 flex items-center justify-center text-sm font-bold text-slate-400">
                  Drop tasks here
                </div>
              ) : (
                colTasks.map(t => {
                  const deadline = getDeadlineInfo(t.due_date);
                  return (
                    <div key={t.id} onClick={() => onTaskClick(t)} className={`bg-white p-3 rounded-xl shadow-sm border border-slate-200 border-l-4 ${theme.border} cursor-pointer hover:shadow-md transition-all group flex flex-col gap-2 min-h-[120px]`}>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{t.ticket_id}</span>
                        {t.priority === 'urgent' && <span className="size-2 rounded-full bg-red-500 mt-1.5" title="Urgent"></span>}
                      </div>
                      <h4 className={`text-sm font-bold text-slate-900 leading-tight ${theme.hoverText}`}>{t.title}</h4>
                      {deadline && (
                        <div className={`mt-auto pt-2 flex items-center gap-1 text-[10px] font-bold ${deadline.color} border px-2 py-1 rounded-md w-fit`}>
                          <Clock className="size-3" />
                          {deadline.text}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. Table View
// ----------------------------------------------------------------------
const TableView = ({ tasks, onTaskClick, onLeaveUsers }: { tasks: Task[], onTaskClick: (t: Task) => void, onLeaveUsers?: Set<string> }) => {
  const [search, setSearch] = useState('');
  
  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.ticket_id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search tasks..." className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-64 shadow-sm" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket ID</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Supervisor</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-center text-sm font-medium text-slate-500">No tasks found.</td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} onClick={() => onTaskClick(t)} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
                  <td className="p-3 text-sm font-bold text-slate-500">{t.ticket_id}</td>
                  <td className="p-3 text-sm font-bold text-slate-900 group-hover:text-slate-900">{t.title}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wide">{t.status.replace('_', ' ')}</span>
                  </td>
                  <td className="p-3 text-sm font-medium text-slate-600 flex items-center gap-2">
                    <UserIcon className="size-4 text-slate-400" /> 
                    {t.assignee ? (
                      <>
                        {(t.assignee as any).full_name}
                        {onLeaveUsers?.has((t.assignee as any).id) && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold ml-1">On Leave</span>}
                      </>
                    ) : 'Unassigned'}
                  </td>
                  <td className="p-3 text-sm font-medium text-slate-600">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. Gantt View
// ----------------------------------------------------------------------
const GanttView = ({ tasks, onTaskClick }: { tasks: Task[], onTaskClick: (t: Task) => void }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full h-[600px] flex flex-col">
       <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900">Project Timeline</h3>
       </div>
       <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-2">
         {tasks.length === 0 ? (
           <div className="flex-1 flex items-center justify-center text-slate-400 font-medium text-sm">No timeline data available.</div>
         ) : (
           tasks.map(t => (
             <div key={t.id} onClick={() => onTaskClick(t)} className="flex items-center gap-2 cursor-pointer group">
               <div className="w-48 truncate text-sm font-bold text-slate-700 group-hover:text-slate-900">{t.ticket_id}: {t.title}</div>
               <div className="flex-1 h-8 bg-slate-100 rounded-lg relative overflow-hidden">
                 {/* Mock Gantt Bar (In reality, width/left derived from dates) */}
                 <div className="absolute top-1 bottom-1 left-[10%] right-[40%] bg-slate-900/80 rounded border border-emerald-600 transition-all group-hover:bg-slate-900"></div>
               </div>
             </div>
           ))
         )}
       </div>
    </div>
  );
};
