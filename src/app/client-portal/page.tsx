'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, AlertCircle, Plus, Loader2, Calendar as CalendarIcon, MessageSquare, Ticket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function ClientDashboardPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  
  const [commentingTaskId, setCommentingTaskId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketCommentText, setTicketCommentText] = useState('');

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, text }: { taskId: number, text: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.from('task_comments').insert({
        task_id: taskId,
        content: text,
        author_id: session.user.id
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setCommentingTaskId(null);
      setCommentText('');
      alert('Comment added successfully! Your Point of Contact will see this.');
    }
  });

  const { data: ticketComments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['client-ticket-comments', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase
        .from('direct_ticket_comments')
        .select(`*, author:profiles!user_id(full_name, avatar_url)`)
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
        
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!selectedTicket,
  });

  const addTicketCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !selectedTicket) throw new Error("Not authenticated");

      const { error } = await supabase.from('direct_ticket_comments').insert({
        ticket_id: selectedTicket.id,
        user_id: session.user.id,
        comment_text: text
      });

      if (error) throw error;
      
      if (selectedTicket.assigned_to) {
        await supabase.from('notifications').insert([{
          user_id: selectedTicket.assigned_to,
          message: `New client comment on ticket: ${selectedTicket.title}`,
          link: '/dashboard/tickets'
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-ticket-comments', selectedTicket?.id] });
      setTicketCommentText('');
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['client-profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase.from('clients').select('id').eq('auth_user_id', session.user.id);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all tasks explicitly filtered by the client's IDs
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['client-tasks', clients],
    queryFn: async () => {
      if (!clients.length) return [];
      const clientIds = clients.map((c: any) => c.id);
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          start_date,
          due_date,
          created_at,
          ticket_id
        `)
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: clients.length > 0
  });

  // Fetch tickets raised by this client
  const { data: clientTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['client-tickets'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      
      const { data, error } = await supabase
        .from('direct_tickets')
        .select('*')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      return data || [];
    }
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('id, poc_our_side')
        .eq('auth_user_id', session.user.id)
        .single();

      if (clientErr || !clientData) throw new Error("No client profile found");

      const clientId = clientData.id;
      const pocs = clientData.poc_our_side || [];

      let assigneeId = null;
      let pocUserIds: string[] = [];

      if (pocs.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('full_name', pocs);

        if (profiles && profiles.length > 0) {
          assigneeId = profiles[0].id;
          pocUserIds = profiles.map((p: any) => p.id);
        }
      }
      
      const { data, error } = await supabase.from('direct_tickets').insert({
        title: ticketTitle,
        description: ticketDescription,
        status: 'Open',
        priority: 'High',
        created_by: session.user.id,
        assigned_to: assigneeId
      }).select().single();

      if (error) throw error;

      if (pocUserIds.length > 0 && data) {
        const notifications = pocUserIds.map(uid => ({
          user_id: uid,
          message: `New Ticket Raised by Client: ${ticketTitle}`,
          link: `/dashboard/tickets`
        }));
        await supabase.from('notifications').insert(notifications);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-tickets'] });
      setIsTicketModalOpen(false);
      setTicketTitle('');
      setTicketDescription('');
      alert('Ticket raised successfully! Your point of contact has been notified.');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'review': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'review': return 'Under Review';
      default: return 'Scheduled';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Work Progress</h2>
          <p className="text-slate-500 text-sm">Track your active tasks and raise support tickets.</p>
        </div>
        <Button 
          onClick={() => setIsTicketModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200 shrink-0"
        >
          <Plus className="size-4 mr-2" />
          Raise a Ticket
        </Button>
      </div>

      {/* Task Timeline / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="size-4 text-emerald-600" />
            Project Timeline
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="size-12 mx-auto text-slate-200 mb-3" />
              <p>No active tasks at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task: any) => (
                <div key={task.id} className="group relative flex flex-col gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                        {task.ticket_id && task.title.startsWith('[TICKET]') && (
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {task.ticket_id}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                        {task.title.replace('[TICKET] ', '')}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <div className="sm:text-right shrink-0 flex flex-col sm:items-end justify-center text-sm text-slate-500 gap-1 mt-2 sm:mt-0">
                      {task.due_date && (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <CalendarIcon className="size-3.5" />
                          Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        Added: {format(new Date(task.created_at), 'MMM d')}
                      </div>
                      
                      <button 
                        onClick={() => {
                          setCommentingTaskId(commentingTaskId === task.id ? null : task.id);
                          setCommentText('');
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"
                      >
                        <MessageSquare className="size-3" />
                        Add Comment
                      </button>
                    </div>
                  </div>
                  
                  {commentingTaskId === task.id && (
                    <div className="pt-3 border-t border-emerald-100/50 mt-1 flex gap-2 animate-in slide-in-from-top-2">
                      <input 
                        type="text"
                        autoFocus
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Type your comment for this task..."
                        className="flex-1 text-sm bg-white border border-emerald-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && commentText.trim()) {
                            addCommentMutation.mutate({ taskId: task.id, text: commentText });
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => addCommentMutation.mutate({ taskId: task.id, text: commentText })}
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                      >
                        {addCommentMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                        Send
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Tickets Section */}
      {clientTickets.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Ticket className="size-4 text-indigo-600" />
              My Raised Tickets
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {clientTickets.map((ticket: any) => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/30 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">{ticket.title}</h4>
                    {ticket.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{ticket.description}</p>
                    )}
                  </div>
                  <div className="sm:text-right shrink-0 flex flex-col sm:items-end justify-center text-sm text-slate-500 gap-1 mt-2 sm:mt-0">
                    <div className="text-xs text-slate-400">
                      Raised: {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="size-4 text-emerald-600" />
                Raise a Support Ticket
              </h3>
              <button 
                onClick={() => setIsTicketModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Issue / Request Title</label>
                <input 
                  type="text" 
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  placeholder="E.g., Need update on website design"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Details</label>
                <textarea 
                  value={ticketDescription}
                  onChange={e => setTicketDescription(e.target.value)}
                  placeholder="Please describe what you need help with..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm h-32 resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsTicketModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createTicket.mutate()} 
                disabled={!ticketTitle.trim() || createTicket.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createTicket.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Submit Ticket
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Ticket className="size-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Ticket Details</h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="space-y-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {selectedTicket.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                      Priority: {selectedTicket.priority}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedTicket.title}</h2>
                  <div className="text-xs text-slate-400 mt-1">Raised on {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}</div>
                </div>
                
                {selectedTicket.description && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MessageSquare className="size-4 text-slate-400" />
                  Conversation
                </h4>
                
                {commentsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-indigo-500" /></div>
                ) : ticketComments.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    No comments yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ticketComments.map((comment: any) => {
                      const isClient = comment.user_id === selectedTicket.created_by;
                      return (
                        <div key={comment.id} className={`flex gap-3 ${isClient ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="size-8 rounded-full overflow-hidden bg-slate-200 shrink-0 shadow-sm border border-slate-100">
                            {comment.author?.avatar_url ? (
                              <img src={comment.author.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-500 bg-gradient-to-br from-slate-100 to-slate-200">
                                {comment.author?.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className={`flex flex-col ${isClient ? 'items-end' : 'items-start'} max-w-[80%]`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-slate-700">{comment.author?.full_name || 'User'}</span>
                              <span className="text-[10px] text-slate-400">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                            </div>
                            <div className={`p-3 rounded-2xl text-sm ${isClient ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200'}`}>
                              {comment.comment_text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Add Comment Input */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={ticketCommentText}
                  onChange={(e) => setTicketCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && ticketCommentText.trim()) {
                      addTicketCommentMutation.mutate(ticketCommentText.trim());
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 h-10 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <Button 
                  onClick={() => addTicketCommentMutation.mutate(ticketCommentText.trim())}
                  disabled={!ticketCommentText.trim() || addTicketCommentMutation.isPending}
                  className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  {addTicketCommentMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
