'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MessageSquare, Trash2, X, Clock, User as UserIcon, ListTodo, ChevronDown, ChevronUp, ChevronsDown } from 'lucide-react';
import { useOnLeaveUsers } from '@/hooks/useOnLeaveUsers';

const ScrollArea = ({ children, className, innerClassName }: { children: React.ReactNode, className?: string, innerClassName?: string }) => {
  const [showIndicator, setShowIndicator] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowIndicator(scrollHeight > clientHeight && scrollHeight - scrollTop - clientHeight > 10);
      }
    };
    checkScroll();
    const observer = new MutationObserver(checkScroll);
    if (scrollRef.current) {
      observer.observe(scrollRef.current, { childList: true, subtree: true, characterData: true });
    }
    window.addEventListener('resize', checkScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  return (
    <div className={`relative flex flex-col min-h-0 overflow-hidden ${className || ''}`}>
      <div 
        ref={scrollRef}
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          setShowIndicator(scrollHeight > clientHeight && scrollHeight - scrollTop - clientHeight > 10);
        }}
        className={`flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${innerClassName || ''}`}
      >
        {children}
      </div>
      
      {showIndicator && (
        <div className="hidden md:flex absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none items-center justify-center gap-1.5 z-10 transition-opacity duration-300 pb-0.5">
          <ChevronsDown className="size-3.5 text-slate-500 animate-bounce" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Scroll Down</span>
        </div>
      )}
    </div>
  );
};

const SystemCommentCard = ({ item, isLatest }: { item: any, isLatest: boolean }) => {
  const normalizedContent = item.content.replace(/<br\s*\/?>/gi, '\n');
  const isMultiline = normalizedContent.includes('\n');
  const [isCollapsed, setIsCollapsed] = useState(isMultiline ? !isLatest : false);
  
  const firstLine = isMultiline ? normalizedContent.split('\n')[0] : normalizedContent;
  const restContent = isMultiline ? normalizedContent.substring(normalizedContent.indexOf('\n') + 1) : '';

  return (
    <div onClick={() => isMultiline && setIsCollapsed(!isCollapsed)} className={`py-2.5 px-3 border rounded-xl shadow-sm text-xs text-slate-600 leading-relaxed transition-colors ${isMultiline ? 'cursor-pointer hover:shadow-md bg-gradient-to-br from-blue-100/50 to-purple-100/50 border-blue-200/50' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 break-words overflow-hidden">
          <span className="font-bold text-slate-800">{item.author_id?.full_name || 'System'}</span>{' '}
          <span dangerouslySetInnerHTML={{__html: firstLine.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-slate-800">$1</span>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>')}} />
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMultiline && (
            <span className="text-slate-400 bg-slate-200/50 rounded-md flex items-center justify-center size-5 hover:bg-slate-200 transition-colors">
              {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </span>
          )}
        </div>
      </div>
      {isMultiline && (
        <div className={`overflow-hidden transition-all duration-300 relative break-words ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100 mt-2 pt-2 border-t border-slate-200/60'}`}>
          <span dangerouslySetInnerHTML={{__html: restContent.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-slate-800">$1</span>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>').replace(/\n/g, '<br/>')}} />
        </div>
      )}
    </div>
  );
};

interface Task {
  id: number;
  client_id: string;
  ticket_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  color: string;
  start_date: string | null;
  due_date: string | null;
  assigned_to: string | null | any;
  current_step_index: number;
  created_at: string;
}

export const TaskDetailModal = ({ task, clientId, clientData: initialClientData, onClose, onInvalidate }: { task: Task, clientId: string, clientData?: any, onClose: () => void, onInvalidate?: () => void }) => {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const { data: onLeaveUsers } = useOnLeaveUsers();
  const [selectLevelIndex, setSelectLevelIndex] = useState<number | null>(null);
  const [selectedUsersForLevel, setSelectedUsersForLevel] = useState<string[]>([]);
  const [isCommentsExpandedMobile, setIsCommentsExpandedMobile] = useState(false);

  const horizontalScrollRef = React.useRef<HTMLDivElement>(null);
  const [isFlowCollapsed, setIsFlowCollapsed] = useState(false);
  const [isDraggingFlow, setIsDraggingFlow] = useState(false);
  const [startXFlow, setStartXFlow] = useState(0);
  const [scrollLeftFlow, setScrollLeftFlow] = useState(0);

  const handleMouseDownFlow = (e: React.MouseEvent) => {
    if (!horizontalScrollRef.current) return;
    setIsDraggingFlow(true);
    setStartXFlow(e.pageX - horizontalScrollRef.current.offsetLeft);
    setScrollLeftFlow(horizontalScrollRef.current.scrollLeft);
  };
  const handleMouseLeaveFlow = () => {
    setIsDraggingFlow(false);
  };
  const handleMouseUpFlow = () => {
    setIsDraggingFlow(false);
  };
  const handleMouseMoveFlow = (e: React.MouseEvent) => {
    if (!isDraggingFlow || !horizontalScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - horizontalScrollRef.current.offsetLeft;
    const walk = (x - startXFlow) * 1.5;
    horizontalScrollRef.current.scrollLeft = scrollLeftFlow - walk;
  };

  const { data: fetchedClientData } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*').eq('id', clientId).single();
      return data;
    },
    enabled: !initialClientData && !!clientId
  });

  const clientData = initialClientData || fetchedClientData;

  const handleInvalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Broad invalidation for global board
    queryClient.invalidateQueries({ queryKey: ['tasks', clientId] });
    queryClient.invalidateQueries({ queryKey: ['task_activity', task.id] });
    queryClient.invalidateQueries({ queryKey: ['my_tasks'] }); // Update dashboards immediately
    queryClient.invalidateQueries({ queryKey: ['task_assignees_modal', task.id] });
    queryClient.invalidateQueries({ queryKey: ['task_user_statuses', task.id] });
    if (onInvalidate) onInvalidate();
  };

  const { data: workflowSteps = [] } = useQuery({
    queryKey: ['vertical_workflow_steps', clientData?.vertical_id],
    queryFn: async () => {
      if (!clientData?.vertical_id) return [];
      const { data, error } = await supabase
        .from('vertical_workflow_steps')
        .select('*, user:profiles(id, full_name, user_roles(role:roles(name)))')
        .eq('vertical_id', clientData.vertical_id)
        .order('order_index', { ascending: true });
      if (error) {
        if (error.code === '42P01') return [];
        console.error(error);
        return [];
      }
      return data;
    },
    enabled: !!clientData?.vertical_id
  });

  const groupedSteps = React.useMemo(() => {
    const groups: Record<number, any[]> = {};
    workflowSteps.forEach((s: any) => {
      if (!groups[s.order_index]) groups[s.order_index] = [];
      groups[s.order_index].push(s);
    });
    return Object.values(groups).sort((a, b) => a[0].order_index - b[0].order_index);
  }, [workflowSteps]);

  const { data: userStatuses = [] } = useQuery({
    queryKey: ['task_user_statuses', task.id],
    queryFn: async () => {
      const { data } = await supabase.from('task_user_statuses').select('*').eq('task_id', task.id);
      return data || [];
    }
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ['task_assignees_modal', task.id],
    queryFn: async () => {
      const { data } = await supabase.from('task_assignees').select('user_id').eq('task_id', task.id);
      return data?.map(a => a.user_id) || [];
    }
  });

  const { data: sessionData } = useQuery({
    queryKey: ['session_modal'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });
  const myUserId = sessionData?.user?.id;
  const myPersonalStatus = myUserId ? (userStatuses.find((s: any) => s.user_id === myUserId)?.status || 'todo') : ((task as any).personal_status || 'todo');

  const updatePersonalStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!myUserId) return;
      await supabase.from('task_user_statuses').upsert({
        task_id: task.id,
        user_id: myUserId,
        status: newStatus,
        updated_at: new Date().toISOString()
      }, { onConflict: 'task_id,user_id' });
      
      await supabase.from('task_audit_logs').insert({
        task_id: task.id,
        changed_by: myUserId,
        field_name: 'personal_status',
        new_value: newStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_user_statuses', task.id] });
      handleInvalidate();
    }
  });

  const advanceStepMutation = useMutation({
    mutationFn: async () => {
      const nextIndex = (task.current_step_index || 0) + 1;
      const targetGroup = groupedSteps[nextIndex];
      if (!targetGroup) return;

      const targetUserIds = targetGroup.map((s: any) => s.user_id);
      const nextStepUser = targetUserIds.length > 0 ? targetUserIds[0] : null;
      
      const { error } = await supabase.from('tasks').update({ 
        current_step_index: nextIndex,
        assigned_to: nextStepUser
      }).eq('id', task.id);
      
      if (error) throw error;

      for (const uid of targetUserIds) {
        await supabase.from('task_assignees').upsert({ task_id: task.id, user_id: uid });
        await supabase.from('task_user_statuses').upsert({ task_id: task.id, user_id: uid, status: 'todo', updated_at: new Date().toISOString() }, { onConflict: 'task_id,user_id' });
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const targetNames = targetGroup.map((s: any) => s.user?.full_name || 'Unknown User').join(', ');
        
        const { data: subtasks } = await supabase.from('task_subtasks').select('*').eq('task_id', task.id);
        const sortOrder = ['Type', 'Posting Date', 'Content', 'Caption', 'Shoot Done?', 'Ads', 'Edited Post Link', 'Instagram Link', 'YouTube Long Link', 'YouTube Shorts Link', 'GMB Posting Link', 'Topic', 'REFERENCE VIDEO LINKS', 'REFERENCE VIDEO / GRAPHIC LINKS', 'REFERENCE LINKS'];
        const sortedSubtasks = [...(subtasks || [])].sort((a, b) => {
          const aIdx = sortOrder.findIndex(t => t.toLowerCase() === a.title.toLowerCase());
          const bIdx = sortOrder.findIndex(t => t.toLowerCase() === b.title.toLowerCase());
          if (aIdx === -1 && bIdx === -1) return a.id - b.id;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        const subtasksStr = sortedSubtasks.length ? '<br/>' + sortedSubtasks.map(s => `${s.title}: ${s.description ? s.description : '[Not Provided Yet]'}`).join('<br/>') : 'None';
        const content = `sent to **${targetNames}**<br/><br/>Task: ${task.title}<br/>Details: ${task.description || 'N/A'}<br/>Mini Tasks: ${subtasksStr}`;

        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content
        });
      }
    },
    onSuccess: handleInvalidate
  });

  const jumpToStepMutation = useMutation({
    mutationFn: async ({ targetIndex, selectedUserIds }: { targetIndex: number, selectedUserIds?: string[] }) => {
      const targetGroup = groupedSteps[targetIndex];
      if (!targetGroup) return;

      const targetUserIds = selectedUserIds && selectedUserIds.length > 0 ? selectedUserIds : targetGroup.map((s: any) => s.user_id);
      const targetStepUser = targetUserIds.length > 0 ? targetUserIds[0] : null;
      
      const { error } = await supabase.from('tasks').update({ 
        current_step_index: targetIndex,
        assigned_to: targetStepUser
      }).eq('id', task.id);
      
      if (error) throw error;

      for (const uid of targetUserIds) {
        await supabase.from('task_assignees').upsert({ task_id: task.id, user_id: uid });
        await supabase.from('task_user_statuses').upsert({ task_id: task.id, user_id: uid, status: 'todo', updated_at: new Date().toISOString() }, { onConflict: 'task_id,user_id' });
      }

      const unselectedUserIds = targetGroup.map((s: any) => s.user_id).filter((id: string) => !targetUserIds.includes(id));
      if (unselectedUserIds.length > 0) {
        await supabase.from('task_assignees').delete().eq('task_id', task.id).in('user_id', unselectedUserIds);
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const targetNames = targetGroup.filter((s: any) => targetUserIds.includes(s.user_id)).map((s: any) => s.user?.full_name || 'Unknown User').join(', ');
        
        const { data: subtasks } = await supabase.from('task_subtasks').select('*').eq('task_id', task.id);
        const sortOrder = ['Type', 'Posting Date', 'Content', 'Caption', 'Shoot Done?', 'Ads', 'Edited Post Link', 'Instagram Link', 'YouTube Long Link', 'YouTube Shorts Link', 'GMB Posting Link', 'Topic', 'REFERENCE VIDEO LINKS', 'REFERENCE VIDEO / GRAPHIC LINKS', 'REFERENCE LINKS'];
        const sortedSubtasks = [...(subtasks || [])].sort((a, b) => {
          const aIdx = sortOrder.findIndex(t => t.toLowerCase() === a.title.toLowerCase());
          const bIdx = sortOrder.findIndex(t => t.toLowerCase() === b.title.toLowerCase());
          if (aIdx === -1 && bIdx === -1) return a.id - b.id;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        const subtasksStr = sortedSubtasks.length ? '<br/>' + sortedSubtasks.map(s => `${s.title}: ${s.description ? s.description : '[Not Provided Yet]'}`).join('<br/>') : 'None';
        const content = `sent to **${targetNames}**<br/><br/>Task: ${task.title}<br/>Details: ${task.description || 'N/A'}<br/>Mini Tasks: ${subtasksStr}`;

        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content
        });
      }
    },
    onSuccess: handleInvalidate
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(task.description || '');

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      await supabase.from('tasks').update(updates).eq('id', task.id);
    },
    onSuccess: () => {
      handleInvalidate();
      setIsEditingDesc(false);
      setIsEditingTitle(false);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('tasks').delete().eq('id', task.id);
    },
    onSuccess: () => {
      handleInvalidate();
      onClose();
    }
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number, title: string }) => {
      await supabase.from('task_subtasks').delete().eq('id', id);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content: `deleted mini task **${title}**`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_subtasks', task.id] });
      handleInvalidate();
      setEditingSubtaskId(null);
    }
  });

  const { data: activityLogs = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ['task_activity', task.id],
    queryFn: async () => {
      const { data: commentsData } = await supabase.from('task_comments').select('*, author_id:profiles(full_name, role)').eq('task_id', task.id);
      const { data: auditData } = await supabase.from('task_audit_logs').select('*, changed_by:profiles(full_name)').eq('task_id', task.id);
      
      const combined = [
        ...(commentsData || []).map((c: any) => ({ type: 'comment', ...c })),
        ...(auditData || []).map((a: any) => ({ type: 'audit', ...a }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return combined;
    }
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data || [];
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      await supabase.from('task_comments').insert({
        task_id: task.id,
        author_id: session.user.id,
        content: newComment
      });
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task_activity', task.id] });
    }
  });

  const { data: subtasks = [], isLoading: isLoadingSubtasks } = useQuery({
    queryKey: ['task_subtasks', task.id],
    queryFn: async () => {
      const { data } = await supabase.from('task_subtasks').select('*, assignee:profiles(id, full_name)').eq('task_id', task.id).order('id', { ascending: true });
      return data || [];
    }
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');

  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskDesc, setEditSubtaskDesc] = useState('');

  const updateSubtaskDetailsMutation = useMutation({
    mutationFn: async ({ id, title, description, old_title, old_description }: { id: number, title: string, description: string, old_title: string, old_description: string }) => {
      await supabase.from('task_subtasks').update({ title, description }).eq('id', id);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        let content = '';
        if (title !== old_title && description !== old_description) {
          content = `changed mini task **${old_title}** to **${title}** and description from **${old_description || 'empty'}** to **${description || 'empty'}**`;
        } else if (title !== old_title) {
          content = `changed mini task **${old_title}** to **${title}**`;
        } else if (description !== old_description) {
          content = `changed **${title}** from **${old_description || 'empty'}** to **${description || 'empty'}**`;
        } else {
          content = `updated mini task **${title}**`;
        }
        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content
        });
      }
    },
    onSuccess: () => {
      setEditingSubtaskId(null);
      queryClient.invalidateQueries({ queryKey: ['task_subtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['task_activity', task.id] });
    }
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('task_subtasks').insert({
        task_id: task.id,
        title: newSubtaskTitle,
        due_date: newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : null
      });
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content: `added new mini task **${newSubtaskTitle}**`
        });
      }
    },
    onSuccess: () => {
      setNewSubtaskTitle('');
      queryClient.invalidateQueries({ queryKey: ['task_subtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['task_activity', task.id] });
    }
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ id, is_completed, title }: { id: number, is_completed: boolean, title: string }) => {
      await supabase.from('task_subtasks').update({ is_completed }).eq('id', id);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content: `marked mini task **${title}** as ${is_completed ? 'completed' : 'incomplete'}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_subtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['task_activity', task.id] });
    }
  });

  const assignSubtaskMutation = useMutation({
    mutationFn: async ({ id, assigned_to, title, old_assigned_to }: { id: number, assigned_to: string | null, title: string, old_assigned_to: string | null }) => {
      await supabase.from('task_subtasks').update({ assigned_to }).eq('id', id);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const assignee = profiles.find((p: any) => p.id === assigned_to)?.full_name || 'Unassigned';
        const old_assignee = profiles.find((p: any) => p.id === old_assigned_to)?.full_name || 'Unassigned';
        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content: `reassigned mini task **${title}** from **${old_assignee}** to **${assignee}**`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_subtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['task_activity', task.id] });
    }
  });

  const updateSubtaskDueDateMutation = useMutation({
    mutationFn: async ({ id, due_date, title, old_due_date }: { id: number, due_date: string | null, title: string, old_due_date: string | null }) => {
      await supabase.from('task_subtasks').update({ due_date }).eq('id', id);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const dateStr = due_date ? new Date(due_date).toLocaleDateString() : 'No due date';
        const oldDateStr = old_due_date ? new Date(old_due_date).toLocaleDateString() : 'No due date';
        await supabase.from('task_comments').insert({
          task_id: task.id, author_id: session.user.id,
          content: `changed due date for mini task **${title}** from **${oldDateStr}** to **${dateStr}**`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_subtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['task_activity', task.id] });
    }
  });

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      
      {/* Mini Modal for User Selection */}
      {selectLevelIndex !== null && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 flex items-center justify-center p-3 backdrop-blur-sm" onClick={() => setSelectLevelIndex(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Send Task to Level {selectLevelIndex + 1}</h3>
            <p className="text-sm text-slate-500 mb-4">Select which employees should receive this task:</p>
            <ScrollArea className="mb-6 max-h-48" innerClassName="space-y-2">
              {groupedSteps[selectLevelIndex].map((s: any) => (
                <label key={s.user_id} className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 rounded-xl transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedUsersForLevel.includes(s.user_id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedUsersForLevel([...selectedUsersForLevel, s.user_id]);
                      else setSelectedUsersForLevel(selectedUsersForLevel.filter(id => id !== s.user_id));
                    }}
                    className="size-4.5 rounded text-indigo-600 focus:ring-indigo-600/20"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{s.user?.full_name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.user?.user_roles?.[0]?.role?.name}</span>
                  </div>
                </label>
              ))}
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setSelectLevelIndex(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
              <button 
                onClick={() => {
                  jumpToStepMutation.mutate({ targetIndex: selectLevelIndex, selectedUserIds: selectedUsersForLevel });
                  setSelectLevelIndex(null);
                }} 
                disabled={selectedUsersForLevel.length === 0 || jumpToStepMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center gap-2"
              >
                {jumpToStepMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Send Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl flex flex-col max-h-[94vh] sm:max-h-[90vh] p-3 sm:p-5 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header Row */}
        <div className="mb-3 pb-4 border-b border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{clientData?.business_name || 'Client'}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { if (confirm('Are you sure you want to delete this main task? This action cannot be undone.')) deleteTaskMutation.mutate(); }} 
                className="p-1 hover:bg-red-50 hover:text-red-600 rounded-lg flex-shrink-0 transition-colors -mt-2 text-slate-400"
                title="Delete Task"
              >
                <Trash2 className="size-5" />
              </button>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg flex-shrink-0 transition-colors -mt-2 -mr-2 text-slate-400 hover:text-slate-600"><X className="size-5" /></button>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full mb-3">
            <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 shrink-0">{task.ticket_id}</span>
            {isEditingTitle ? (
              <input 
                autoFocus 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                onBlur={() => { if (editTitle !== task.title) updateTaskMutation.mutate({ title: editTitle }); else setIsEditingTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className="font-extrabold text-xl text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5 flex-1 max-w-2xl shadow-sm focus:outline-none focus:border-slate-500"
              />
            ) : (
              <h3 onClick={() => { setEditTitle(task.title); setIsEditingTitle(true); }} className="font-extrabold text-xl text-slate-900 cursor-pointer hover:bg-slate-100 px-3 py-1.5 rounded-lg flex-1 max-w-2xl truncate" title="Click to edit">{task.title}</h3>
            )}
          </div>
          
          {/* Description Section */}
          <div className="mb-4">
            {isEditingDesc ? (
              <div className="space-y-2 flex-1 flex flex-col">
                <textarea 
                  autoFocus 
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)} 
                  className="w-full text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:border-slate-500 resize-none min-h-[80px]"
                  placeholder="Enter a detailed description..."
                />
                <div className="flex gap-2">
                  <button onClick={() => { if (editDesc !== task.description) updateTaskMutation.mutate({ description: editDesc }); else setIsEditingDesc(false); }} disabled={updateTaskMutation.isPending} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50">{updateTaskMutation.isPending ? 'Saving...' : 'Save Description'}</button>
                  <button onClick={() => { setIsEditingDesc(false); setEditDesc(task.description || ''); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div onClick={() => { setEditDesc(task.description || ''); setIsEditingDesc(true); }} className="text-sm text-slate-600 bg-slate-50/50 hover:bg-slate-50 p-3 rounded-xl border border-transparent hover:border-slate-200 cursor-pointer transition-colors whitespace-pre-wrap break-words overflow-hidden min-h-[48px] line-clamp-4" title="Click to edit">
                {task.description || <span className="text-slate-400 italic">Click to add a description...</span>}
              </div>
            )}
          </div>

          {/* Sleek Properties Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap w-full gap-2 mb-1">
            <label className="flex-1 min-w-0 md:min-w-[120px] flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm hover:shadow  transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/50 cursor-pointer group">
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-wider transition-colors">Status</span>
              <select 
                className="bg-transparent w-full text-xs font-bold text-slate-700 focus:outline-none cursor-pointer" 
                value={myPersonalStatus}
                onChange={(e) => updatePersonalStatusMutation.mutate(e.target.value)}
                disabled={updatePersonalStatusMutation.isPending || !myUserId}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </label>
            
            <label className="flex-1 min-w-0 md:min-w-[120px] flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm hover:shadow  transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/50 cursor-pointer group">
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-wider transition-colors">Priority</span>
              <select 
                className="bg-transparent w-full text-xs font-bold text-slate-700 focus:outline-none cursor-pointer" 
                defaultValue={task.priority}
                onChange={(e) => updateTaskMutation.mutate({ priority: e.target.value })}
                disabled={updateTaskMutation.isPending}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            
            <label className="col-span-2 sm:col-span-1 flex-1 min-w-0 md:min-w-[140px] flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm hover:shadow  transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/50 cursor-pointer group">
              <UserIcon className="size-3 text-slate-400 group-hover:text-slate-500 shrink-0 transition-colors" />
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-wider transition-colors">Supervisor</span>
              <select 
                className="bg-transparent w-full text-xs font-bold text-slate-700 focus:outline-none cursor-pointer truncate" 
                value={typeof task.assigned_to === 'object' && task.assigned_to !== null ? (task.assigned_to as any).id : (task.assigned_to || '')}
                onChange={(e) => updateTaskMutation.mutate({ assigned_to: e.target.value || null })}
                disabled={updateTaskMutation.isPending}
              >
                <option value="">Unassigned</option>
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.full_name} {onLeaveUsers?.has(p.id) ? '(On Leave)' : ''}</option>
                ))}
              </select>
            </label>

            <label className="flex-1 min-w-0 md:min-w-[120px] flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm hover:shadow  transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/50 cursor-pointer group">
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-wider transition-colors">Start</span>
              <input 
                type="date"
                className="bg-transparent w-full text-xs font-bold text-slate-700 focus:outline-none cursor-pointer" 
                value={task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : ''}
                max={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  const maxDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : null;
                  if (val && maxDate && val > maxDate) {
                    alert('Start date cannot be after due date.');
                    return;
                  }
                  updateTaskMutation.mutate({ start_date: val ? new Date(val).toISOString() : null });
                }}
                disabled={updateTaskMutation.isPending}
              />
            </label>
            
            <label className="flex-1 min-w-0 md:min-w-[120px] flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm hover:shadow  transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/50 cursor-pointer group">
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-wider transition-colors">Due</span>
              <input 
                type="date"
                className="bg-transparent w-full text-xs font-bold text-slate-700 focus:outline-none cursor-pointer" 
                value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                min={task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  const minDate = task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : null;
                  if (val && minDate && val < minDate) {
                    alert('Due date cannot be before start date.');
                    return;
                  }
                  updateTaskMutation.mutate({ due_date: val ? new Date(val).toISOString() : null });
                }}
                disabled={updateTaskMutation.isPending}
              />
            </label>
          </div>
        </div>

        {/* Horizontal Workflow Flow */}
        {groupedSteps.length > 0 && (
          <div className="mb-4 bg-white border border-slate-200/60 rounded-xl shadow-sm flex flex-col overflow-hidden shrink-0 z-10 relative">
            <button 
              onClick={() => setIsFlowCollapsed(!isFlowCollapsed)}
              className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors text-slate-700 text-sm font-bold"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">Workflow Pipeline</span>
              </div>
              <div className="bg-slate-200/80 p-1 rounded-md text-slate-500 hover:text-slate-800 transition-colors">
                {isFlowCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </div>
            </button>
            
            <div 
              style={{
                display: 'grid',
                gridTemplateRows: isFlowCollapsed ? '0fr' : '1fr',
              }}
              className={`transition-all duration-300 ease-in-out ${isFlowCollapsed ? 'opacity-0' : 'opacity-100 border-t border-slate-100'}`}
            >
              <div className="overflow-hidden min-h-0">
                <div className="p-2 md:p-3 flex flex-col md:flex-row md:items-center gap-3">
            
            {/* Scrollable Steps Area */}
            <div 
              ref={horizontalScrollRef}
              onMouseDown={handleMouseDownFlow}
              onMouseLeave={handleMouseLeaveFlow}
              onMouseUp={handleMouseUpFlow}
              onMouseMove={handleMouseMoveFlow}
              className={`flex-1 min-w-0 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isDraggingFlow ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <div className="flex items-center gap-3 min-w-max">
                {groupedSteps.map((group, idx) => {
                  const currentIndex = task.current_step_index || 0;
                  const isCompleted = idx < currentIndex;
                  const isCurrent = idx === currentIndex;
                  const isPending = idx > currentIndex;

                  return (
                    <React.Fragment key={group[0].order_index}>
                        <button 
                          onClick={() => {
                            if (group.length > 1) {
                              setSelectLevelIndex(idx);
                              // Only pre-select users if they are already in the assignees list.
                              const currentlyAssigned = group.filter((s: any) => assignees.includes(s.user_id)).map((s: any) => s.user_id);
                              setSelectedUsersForLevel(currentlyAssigned);
                            } else {
                              jumpToStepMutation.mutate({ targetIndex: idx });
                            }
                          }}
                          disabled={jumpToStepMutation.isPending || advanceStepMutation.isPending}
                          title={`Send to ${group.map((s: any) => s.user?.full_name).join(', ')}`}
                          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ease-out text-left group shrink-0 ${
                            isCompleted ? 'bg-white border-2 border-indigo-500 text-indigo-700 hover:bg-indigo-600 hover:border-indigo-600 hover:shadow-lg cursor-pointer' : 
                            isCurrent ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 scale-105 z-10 border-none cursor-default ring-2 ring-indigo-50' : 
                            'bg-slate-50/80 border border-slate-200 text-slate-500 hover:bg-indigo-600 hover:border-indigo-600 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                          }`}
                        >
                          <div className={`size-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                            isCompleted ? 'bg-indigo-100 text-indigo-700 group-hover:bg-white/20 group-hover:text-white' : 
                            isCurrent ? 'bg-white/20 text-white shadow-inner' : 
                            'bg-slate-200 text-slate-400 group-hover:bg-white/20 group-hover:text-white'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="size-4" strokeWidth={3} /> : idx + 1}
                          </div>
                          <div className="flex flex-col min-w-[120px] max-w-[200px]">
                            {group.map((step: any, i: number) => {
                              const isUserAssigned = assignees.includes(step.user_id) || (typeof task.assigned_to === 'object' ? task.assigned_to?.id === step.user_id : task.assigned_to === step.user_id) || (assignees.length === 0 && task.assigned_to === null);
                              const isStepActive = isCurrent && isUserAssigned;
                              const isStepInactiveInCurrent = isCurrent && !isUserAssigned;

                              return (
                                <div key={step.id} className={`${i > 0 ? 'mt-1 pt-1 border-t border-white/20' : ''}`}>
                                  <span className={`text-[13px] font-extrabold tracking-wide truncate transition-colors block ${
                                    isStepActive ? 'text-white drop-shadow-sm' : 
                                    isStepInactiveInCurrent ? 'text-white/40' : 
                                    'text-slate-800 group-hover:text-white'
                                  }`}>
                                    <span className={isCurrent ? "" : "group-hover:hidden"}>{step.user?.full_name || 'Unknown User'}</span>
                                    {!isCurrent && <span className="hidden group-hover:inline">Send to {step.user?.full_name?.split(' ')[0] || 'User'}</span>}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider truncate mt-0.5 transition-colors block ${
                                    isStepActive ? 'text-indigo-100' : 
                                    isStepInactiveInCurrent ? 'text-indigo-100/40' : 
                                    'text-slate-400 group-hover:text-indigo-200'
                                  }`}>
                                    {step.user?.user_roles?.[0]?.role?.name || 'No Role'}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-widest truncate mt-1 transition-colors block ${
                                    isCompleted ? 'text-indigo-500 group-hover:text-indigo-200' : 
                                    isStepActive ? 'text-white/90 drop-shadow-sm' : 
                                    isStepInactiveInCurrent ? 'text-white/40' :
                                    'text-slate-400 group-hover:text-indigo-200'
                                  }`}>
                                    {(() => {
                                      const st = userStatuses.find((s: any) => s.user_id === step.user_id)?.status || (isStepActive ? 'todo' : 'unassigned');
                                      return st.replace('_', ' ');
                                    })()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </button>
                      {idx < groupedSteps.length - 1 && (() => {
                        const getGroupAnchors = (grp: any[]) => {
                          if (grp.length <= 1) return [0];
                          const assigned = grp.filter(step => assignees.includes(step.user_id) || (typeof task.assigned_to === 'object' ? task.assigned_to?.id === step.user_id : task.assigned_to === step.user_id) || (assignees.length === 0 && task.assigned_to === null));
                          if (assigned.length === 0) return [0];
                          return assigned.map(u => {
                            const userIndex = grp.findIndex(step => step.user_id === u.user_id);
                            if (userIndex === 0) return -1;
                            if (userIndex === grp.length - 1) return 1;
                            return 0;
                          });
                        };
                        const anchors1 = getGroupAnchors(group);
                        const anchors2 = getGroupAnchors(groupedSteps[idx + 1]);
                        
                        return (
                          <svg 
                            className={`w-6 sm:w-8 h-16 shrink-0 z-0 overflow-visible transition-all duration-500 ${isCompleted ? 'drop-shadow-sm' : ''}`} 
                            viewBox="0 0 48 80" 
                            preserveAspectRatio="none"
                          >
                            {anchors1.flatMap((a1, i1) => 
                              anchors2.map((a2, i2) => (
                                <g key={`${i1}-${i2}`}>
                                  <path 
                                    d={`M 0,${40 + a1 * 24} C 24,${40 + a1 * 24} 24,${40 + a2 * 24} 38,${40 + a2 * 24}`} 
                                    fill="none" 
                                    strokeWidth="6" 
                                    className={`transition-colors duration-500 ${isCompleted ? 'stroke-indigo-500' : 'stroke-slate-200'}`} 
                                  />
                                  <polygon 
                                    points={`36,${40 + a2 * 24 - 7} 48,${40 + a2 * 24} 36,${40 + a2 * 24 + 7}`} 
                                    className={`transition-colors duration-500 ${isCompleted ? 'fill-indigo-500' : 'fill-slate-200'}`} 
                                  />
                                </g>
                              ))
                            )}
                          </svg>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    )}

        {/* Responsive Content Area: Stacked on Mobile, 2-Column on Desktop */}
        <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-y-auto md:overflow-hidden min-h-0">
          {/* Left: Mini Tasks */}
          <ScrollArea className="flex-1 md:flex-[3] min-h-[220px] md:min-h-0" innerClassName="pr-1 sm:pr-2">
            {/* Mini Tasks Section */}
            <div className="mt-3">
              <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                <ListTodo className="size-4 text-slate-900" /> Mini Tasks
              </h4>
              <div className="space-y-2 mb-3">
                {isLoadingSubtasks ? (
                  <div className="flex items-center text-slate-400 text-sm font-medium"><Loader2 className="size-4 animate-spin mr-2" /> Loading...</div>
                ) : subtasks.length === 0 ? (
                  <div className="text-slate-400 text-sm italic">No mini tasks added yet.</div>
                ) : (
                  (() => {
                    const typeSubtask = subtasks.find((s: any) => s.title.toLowerCase() === 'type');
                    const currentType = typeSubtask?.description?.toLowerCase() || 'reel';
                    const getDisplayTitle = (title: string) => {
                      const t = title.toUpperCase();
                      if (t === 'REFERENCE VIDEO / GRAPHIC LINKS' || t === 'REFERENCE VIDEO LINKS' || t === 'REFERENCE LINKS') {
                        return currentType === 'graphics' ? 'REFERENCE LINKS' : 'REFERENCE VIDEO LINKS';
                      }
                      return title;
                    };

                    return subtasks.map((st: any) => {
                      const displayTitle = getDisplayTitle(st.title);
                      return (
                        <div 
                          key={st.id} 
                          className={`flex flex-col gap-1.5 p-2 rounded-xl border transition-all cursor-pointer hover:border-slate-200 ${st.is_completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}
                          onClick={() => {
                            if (editingSubtaskId !== st.id) {
                              setEditSubtaskTitle(displayTitle);
                              setEditSubtaskDesc(st.description || '');
                              setEditingSubtaskId(st.id);
                            }
                          }}
                        >
                      {editingSubtaskId === st.id ? (
                        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                          <input 
                            className="text-sm font-bold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500 w-full"
                            value={editSubtaskTitle}
                            onChange={(e) => setEditSubtaskTitle(e.target.value)}
                            placeholder="Mini task title"
                          />
                          {editSubtaskTitle.toLowerCase() === 'type' ? (
                            <select
                              autoFocus
                              className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 w-full cursor-pointer"
                              value={editSubtaskDesc}
                              onChange={(e) => setEditSubtaskDesc(e.target.value)}
                            >
                              <option value="">Select type...</option>
                              <option value="Reel">Reel</option>
                              <option value="Graphics">Graphics</option>
                            </select>
                          ) : editSubtaskTitle.trim().toLowerCase() === 'shoot done?' ? (
                            <div className="flex flex-col gap-2">
                              <select
                                autoFocus
                                className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 w-full cursor-pointer"
                                value={editSubtaskDesc.startsWith('Yes') ? 'Yes' : editSubtaskDesc.startsWith('No') ? 'No' : ''}
                                onChange={(e) => {
                                  if (e.target.value === 'No') setEditSubtaskDesc('No');
                                  else if (e.target.value === 'Yes') setEditSubtaskDesc('Yes\n');
                                  else setEditSubtaskDesc('');
                                }}
                              >
                                <option value="">Select...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                              {editSubtaskDesc.startsWith('Yes') && (
                                <div className="flex flex-col gap-2 mt-1">
                                  {editSubtaskDesc.split('\n').slice(1).map((link, idx) => (
                                     <div key={idx} className="flex items-center gap-2">
                                       <input 
                                         className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500 flex-1"
                                         placeholder="Paste link here..."
                                         value={link}
                                         onChange={(e) => {
                                           const lines = editSubtaskDesc.split('\n');
                                           lines[idx + 1] = e.target.value;
                                           setEditSubtaskDesc(lines.join('\n'));
                                         }}
                                       />
                                       <button 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           const lines = editSubtaskDesc.split('\n');
                                           lines.splice(idx + 1, 1);
                                           setEditSubtaskDesc(lines.join('\n'));
                                         }}
                                         className="text-red-500 hover:text-red-700 font-bold px-2"
                                       >×</button>
                                     </div>
                                  ))}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditSubtaskDesc(editSubtaskDesc + '\n');
                                    }}
                                    className="text-xs font-bold text-slate-900 hover:text-slate-900 self-start"
                                  >+ Add Link</button>
                                </div>
                              )}
                            </div>
                          ) : editSubtaskTitle.trim().toLowerCase() === 'ads' ? (
                            <select
                              autoFocus
                              className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 w-full cursor-pointer"
                              value={editSubtaskDesc}
                              onChange={(e) => setEditSubtaskDesc(e.target.value)}
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          ) : editSubtaskTitle.trim().toLowerCase() === 'posting date' ? (
                            <input
                              autoFocus
                              type="date"
                              className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 w-full cursor-pointer text-slate-700"
                              value={editSubtaskDesc}
                              onChange={(e) => setEditSubtaskDesc(e.target.value)}
                            />
                          ) : (
                            <textarea
                              autoFocus
                              className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 w-full resize-none h-20"
                              value={editSubtaskDesc}
                              onChange={(e) => setEditSubtaskDesc(e.target.value)}
                              placeholder="Add a description..."
                            />
                          )}
                          <div className="flex justify-between gap-2">
                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete this mini task?')) deleteSubtaskMutation.mutate({ id: st.id, title: st.title }); }} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete Mini Task">
                              <Trash2 className="size-4" />
                            </button>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setEditingSubtaskId(null); }} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Cancel</button>
                              <button onClick={(e) => { e.stopPropagation(); updateSubtaskDetailsMutation.mutate({ id: st.id, title: editSubtaskTitle, description: editSubtaskDesc, old_title: st.title, old_description: st.description || '' }); }} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50" disabled={!editSubtaskTitle || updateSubtaskDetailsMutation.isPending}>Save</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleSubtaskMutation.mutate({ id: st.id, is_completed: !st.is_completed, title: displayTitle }); }}
                            className={`size-4 rounded-full flex items-center justify-center border transition-colors shrink-0 ${st.is_completed ? 'bg-slate-900 border-slate-500 text-white' : 'border-slate-300 text-transparent hover:border-slate-500 hover:text-slate-700'}`}
                          >
                            <CheckCircle2 className="size-3.5" />
                          </button>
                          
                          <div className="flex-1 flex items-center gap-1.5 min-w-0">
                            <span className={`text-sm truncate transition-all ${st.is_completed ? 'text-slate-400 line-through' : 'text-slate-700 font-bold'}`}>{displayTitle}</span>
                            {st.description && (
                              <>
                                <span className="text-slate-400 text-[10px] font-bold shrink-0 mt-0.5">{'>'}</span>
                                <span className="text-sm font-medium text-slate-600 truncate">{st.description}</span>
                              </>
                            )}
                          </div>
                          
                          <div className="text-[10px] font-medium text-slate-400 shrink-0 ml-1">
                            {new Date(st.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
              </div>
              
              <div className="flex items-center gap-2 pb-4 mt-2">
                <input 
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && newSubtaskTitle) addSubtaskMutation.mutate(); }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-slate-500" 
                  placeholder="Add a new mini task..." 
                />
                <button 
                  onClick={() => addSubtaskMutation.mutate()}
                  disabled={!newSubtaskTitle || addSubtaskMutation.isPending}
                  className="bg-slate-100 text-slate-900 px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </ScrollArea>
          
          {/* Right/Bottom: Comments / Activity */}
          <div className="flex-1 md:flex-[2] flex flex-col border-t md:border-t-0 md:border-l border-slate-200/60 pt-3 md:pt-0 pl-0 md:pl-5 shrink-0 md:shrink">
            <button 
              onClick={() => setIsCommentsExpandedMobile(!isCommentsExpandedMobile)}
              className="flex items-center justify-between w-full text-left md:pointer-events-none mb-2 pb-2 border-b border-slate-100 bg-slate-50/50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none transition-colors cursor-pointer md:cursor-default"
            >
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="size-4 text-slate-400" /> Comments
                {activityLogs.length > 0 && (
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-slate-200">
                    {activityLogs.length}
                  </span>
                )}
              </h4>
              <div className="md:hidden text-slate-600 flex items-center gap-1 text-xs font-bold bg-slate-200/70 px-2.5 py-1 rounded-lg">
                <span>{isCommentsExpandedMobile ? 'Hide Comments' : 'Show Comments'}</span>
                {isCommentsExpandedMobile ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </div>
            </button>
            
            <div className={`${isCommentsExpandedMobile ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-h-[260px] md:min-h-0`}>
              <ScrollArea className="flex-1 mb-3 max-h-[350px] md:max-h-none" innerClassName="pr-2 space-y-2">
                {isLoadingActivity ? (
                  <div className="flex items-center justify-center h-32 text-slate-400 text-sm font-medium"><Loader2 className="size-5 animate-spin mr-2" /> Loading...</div>
                ) : activityLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-32 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium bg-slate-50/50">
                    No comments yet.
                  </div>
                ) : (
                  (() => {
                    const systemComments = activityLogs.filter((item: any) => item.type === 'comment' && /^(changed|added|deleted|marked|reassigned|updated|sent to)/i.test(item.content));
                    const latestSystemCommentId = systemComments.length > 0 ? systemComments[0].id : null;
                    
                    return activityLogs.map((item: any) => {
                      if (item.type === 'comment') {
                        const isSystem = /^(changed|added|deleted|marked|reassigned|updated|sent to)/i.test(item.content);
                        if (isSystem) {
                          return <SystemCommentCard key={`comment-${item.id}`} item={item} isLatest={item.id === latestSystemCommentId} />;
                        }

                        const isClient = item.author_id?.role === 'client';
                        return (
                          <div key={`comment-${item.id}`} className={`${isClient ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'} p-3.5 rounded-xl border`}>
                            <div className="flex justify-between items-start mb-1.5">
                              <span className={`text-xs font-bold ${isClient ? 'text-red-700' : 'text-slate-700'}`}>{item.author_id?.full_name || 'Unknown'} {isClient && <span className="font-normal text-red-500 ml-1">(Client)</span>}</span>
                              <span className={`text-[10px] ${isClient ? 'text-red-400' : 'text-slate-400'} whitespace-nowrap ml-2`}>{new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden ${isClient ? 'text-red-600' : 'text-slate-600'}`}>{item.content}</p>
                          </div>
                        );
                      } else {
                        const renderVal = (v: string | null) => {
                          if (!v) return 'nothing';
                          if (item.field_name === 'assigned_to') {
                            const profile = profiles.find((p: any) => p.id === v);
                            return profile ? profile.full_name : v;
                          }
                          if (item.field_name === 'start_date' || item.field_name === 'due_date') {
                            return v.split(' ')[0].split('T')[0];
                          }
                          return v.length > 80 ? v.substring(0, 80) + '...' : v;
                        };
                        return (
                          <div key={`audit-${item.id}`} className="py-2.5 px-3 bg-white border border-slate-100 rounded-xl flex items-start gap-2.5 shadow-sm">
                            <div className="size-2 bg-slate-900 rounded-full flex-shrink-0 mt-1.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-600 leading-relaxed break-words">
                                <span className="font-bold text-slate-800">{item.changed_by?.full_name || 'System'}</span> changed <span className="font-bold text-slate-800 capitalize">{item.field_name === 'assigned_to' ? 'supervisor' : item.field_name.replace('_', ' ')}</span> from <span className="line-through text-slate-400 break-all">{renderVal(item.old_value)}</span> to <span className="text-slate-800 font-medium bg-slate-100 px-1 rounded break-all">{renderVal(item.new_value)}</span>
                              </p>
                              <span className="text-[10px] text-slate-400 block mt-1">{new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      }
                    });
                  })()
                )}
              </ScrollArea>
              
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && newComment) addCommentMutation.mutate(); }}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:border-slate-500" 
                  placeholder="Add a comment..." 
                />
                <button 
                  onClick={() => addCommentMutation.mutate()}
                  disabled={!newComment || addCommentMutation.isPending}
                  className="bg-slate-900 text-white px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {addCommentMutation.isPending ? '...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
