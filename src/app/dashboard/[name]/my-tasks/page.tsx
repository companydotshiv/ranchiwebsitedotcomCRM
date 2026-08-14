'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';

const COLUMNS = [
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

export default function MyTasksPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [mySessionId, setMySessionId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const activeUserId = selectedUserId || mySessionId;

  // Opt-in for DnD on client-side only
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
    supabase.auth.getSession().then(({ data }) => setMySessionId(data.session?.user?.id || null));
  }, []);

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

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data || [];
    },
    enabled: !!currentUser?.isAdmin
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my_tasks', activeUserId],
    queryFn: async () => {
      const [{ data: parentTasks, error: parentErr }, { data: subtasks }, { data: myWorkflowSteps }, { data: myAssignments }] = await Promise.all([
        supabase.from('tasks').select(`*, client:clients(id, business_name), task_subtasks(id, title, assigned_to, is_completed)`).eq('assigned_to', activeUserId).order('created_at', { ascending: false }),
        supabase.from('task_subtasks').select('task_id').eq('assigned_to', activeUserId),
        supabase.from('vertical_workflow_steps').select('vertical_id').eq('user_id', activeUserId),
        supabase.from('task_assignees').select('task_id').eq('user_id', activeUserId)
      ]);
      
      console.log('[MyTasks] parentTasks:', parentTasks?.length, 'error:', parentErr);
      
      // Find flow tasks: tasks in verticals where this user is a workflow participant
      const myVerticalIds = myWorkflowSteps?.map(s => s.vertical_id) || [];
      let workflowTaskIds: number[] = [];
      if (myVerticalIds.length > 0) {
        const { data: flowTasks } = await supabase.from('tasks').select('id').in('vertical_id', myVerticalIds);
        workflowTaskIds = flowTasks?.map(t => t.id) || [];
      }
      
      const subtaskIds = Array.from(new Set(subtasks?.map(s => s.task_id) || []));
      const assignmentTaskIds = Array.from(new Set(myAssignments?.map(a => a.task_id) || []));
      const myTaskIds = new Set(parentTasks?.map(t => t.id) || []);
      
      const allMissingIds = new Set([...subtaskIds, ...workflowTaskIds, ...assignmentTaskIds]);
      const missingTaskIds = Array.from(allMissingIds).filter(id => !myTaskIds.has(id));
      
      let allTasks = parentTasks || [];
      
      if (missingTaskIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < missingTaskIds.length; i += chunkSize) {
          const chunk = missingTaskIds.slice(i, i + chunkSize);
          const { data: extraTasks } = await supabase.from('tasks').select(`*, client:clients(id, business_name), task_subtasks(id, title, assigned_to, is_completed)`).in('id', chunk).order('created_at', { ascending: false });
          if (extraTasks) {
            allTasks = [...allTasks, ...extraTasks];
          }
        }
      }
      
      // Fetch personal statuses for these tasks
      const allTaskIds = allTasks.map(t => t.id);
      let personalStatuses: any[] = [];
      if (allTaskIds.length > 0) {
        const { data: pData } = await supabase.from('task_user_statuses').select('task_id, status').eq('user_id', activeUserId).in('task_id', allTaskIds);
        personalStatuses = pData || [];
      }
      const statusMap = new Map(personalStatuses.map(ps => [ps.task_id, ps.status]));
      
      allTasks = allTasks.map(t => ({
        ...t,
        personal_status: statusMap.get(t.id) || 'todo'
      }));
      
      allTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return allTasks;
    },
    enabled: !!activeUserId
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: number, newStatus: string }) => {
      await supabase.from('task_user_statuses').upsert({ 
        task_id: taskId, 
        user_id: activeUserId, 
        status: newStatus,
        updated_at: new Date().toISOString()
      }, { onConflict: 'task_id,user_id' });
      
      if (activeUserId) {
        await supabase.from('task_audit_logs').insert({
          task_id: taskId,
          changed_by: mySessionId, // Audit log should record the logged-in user making the change
          field_name: 'personal_status',
          new_value: newStatus
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_tasks', activeUserId] });
    }
  });

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceColumn = source.droppableId;
    const destColumn = destination.droppableId;
    const taskId = parseInt(draggableId.split('-')[1]);

    if (sourceColumn !== destColumn) {
      // Optimistic update via React Query cache
      queryClient.setQueryData(['my_tasks', activeUserId], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(t => t.id === taskId ? { ...t, personal_status: destColumn } : t);
      });
      updateTaskStatusMutation.mutate({ taskId, newStatus: destColumn });
    }
  };

  if (!isBrowser) return null;

  if (isLoading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            {activeUserId === mySessionId ? 'My Assigned Tasks' : `${teamMembers.find(m => m.id === activeUserId)?.full_name || 'Employee'}'s Tasks`}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Manage tasks assigned to {activeUserId === mySessionId ? 'you' : 'this employee'} across all clients.</p>
        </div>

        {currentUser?.isAdmin && teamMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">Viewing:</span>
            <select
              value={activeUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {teamMembers.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.id === mySessionId ? 'My Tasks' : member.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar flex-1 min-h-[500px]">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.personal_status === col.id);
            const theme = COLOR_MAP[col.color] || COLOR_MAP.slate;

            return (
              <div key={col.id} className="flex-1 min-w-[320px] flex-shrink-0 bg-slate-100/50 rounded-2xl border border-slate-200/60 flex flex-col shadow-sm">
                <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-slate-100/80 rounded-t-2xl">
                  <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2.5 tracking-tight">
                    <span className={`size-3 rounded-full shadow-sm ${theme.dot}`} />
                    {col.label}
                  </h3>
                  <span className="bg-white text-slate-600 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm border border-slate-200/50">{colTasks.length}</span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={`p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar transition-colors duration-200 rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                    >
                      {colTasks.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl h-28 flex flex-col items-center justify-center text-sm font-bold text-slate-400 bg-white/40">
                          Drop tasks here
                        </div>
                      ) : (
                        colTasks.map((t, index) => (
                          <Draggable key={t.id.toString()} draggableId={`task-${t.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedTask(t)}
                                style={{ ...provided.draggableProps.style }}
                                className={`bg-white p-4 rounded-xl border border-slate-200 border-l-4 ${theme.border} cursor-pointer transition-all flex flex-col gap-2.5 min-h-[130px] ${snapshot.isDragging ? 'shadow-xl scale-[1.02] rotate-1 z-50 ring-2 ring-indigo-500/20' : 'shadow-sm hover:shadow-md'} ${t.assigned_to === activeUserId ? 'animate-pulse-yellow' : ''}`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex flex-col gap-1.5 min-w-0">
                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit uppercase tracking-widest">{t.ticket_id}</span>
                                    <span className="text-xs font-bold text-indigo-600 truncate">{t.client?.business_name || 'Unknown Client'}</span>
                                  </div>
                                  {t.priority === 'urgent' && <span className="size-2.5 rounded-full bg-red-500 mt-1 shadow-sm shadow-red-500/40" title="Urgent"></span>}
                                </div>
                                <h4 className={`text-[15px] font-bold text-slate-900 leading-snug mt-1 ${theme.hoverText}`}>{t.title}</h4>
                                
                                {/* Badges for Assignment Type */}
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                  {t.assigned_to === activeUserId ? (
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shadow-sm border border-blue-100">Assigned</span>
                                  ) : t.task_subtasks?.some((s: any) => s.assigned_to === activeUserId) ? (
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded shadow-sm border border-amber-100">Mini Task</span>
                                  ) : (
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded shadow-sm border border-purple-100">Flow</span>
                                  )}
                                </div>

                                <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-50">
                                  {t.due_date ? (
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                      <CalendarIcon className="size-3.5" />
                                      {new Date(t.due_date).toLocaleDateString()}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-medium italic">No due date</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {(() => {
        const activeTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) || selectedTask : null;
        return activeTask && (
          <TaskDetailModal 
            task={activeTask}
            clientId={activeTask.client_id}
            clientData={{ business_name: activeTask.client?.business_name, vertical_id: activeTask.vertical_id }}
            onClose={() => setSelectedTask(null)}
            onInvalidate={() => queryClient.invalidateQueries({ queryKey: ['my_tasks', activeUserId] })}
          />
        );
      })()}
    </div>
  );
}
