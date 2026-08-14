'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MotionDiv, fadeInUp, staggerContainer } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Plus, X, Search, ShieldAlert, CheckCircle, Ticket, Filter, AlertCircle, Clock, CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';

interface DirectTicket {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created_by: string;
  assigned_to: string;
  created_at: string;
  creator?: { full_name: string; avatar_url: string };
  assignee?: { full_name: string; avatar_url: string };
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DirectTicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  author?: { full_name: string; avatar_url: string };
}

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
          <h3 className="font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="size-4 text-indigo-600" /> {title}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><X className="size-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function TicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  
  const [userId, setUserId] = useState<string | null>(null);
  
  // Modals state
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<DirectTicket | null>(null);

  // Filters
  const [filter, setFilter] = useState<'All' | 'Assigned to Me' | 'Raised by Me'>('All');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      else router.push('/login');
    };
    getUser();
  }, [router]);

  // Fetch Users for Assignment
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees_list'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch Tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<DirectTicket[]>({
    queryKey: ['direct_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_tickets')
        .select(`
          *,
          creator:profiles!created_by(full_name, avatar_url),
          assignee:profiles!assigned_to(full_name, avatar_url)
        `)
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .order('created_at', { ascending: false });
        
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch Comments for Selected Ticket
  const { data: comments = [], isLoading: commentsLoading } = useQuery<DirectTicketComment[]>({
    queryKey: ['ticket_comments', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase
        .from('direct_ticket_comments')
        .select(`
          *,
          author:profiles!user_id(full_name, avatar_url)
        `)
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
        
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!selectedTicket,
  });

  const resetForm = () => {
    setTitle(''); setDescription(''); setPriority('Medium'); setAssignedTo('');
  };

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedTicket || !userId) return;
      const { error } = await supabase.from('direct_ticket_comments').insert([{
        ticket_id: selectedTicket.id,
        user_id: userId,
        comment_text: text
      }]);
      if (error) throw error;
      
      // Notify assigned user if commenter is not assigned user
      if (selectedTicket.assigned_to && selectedTicket.assigned_to !== userId) {
        await supabase.from('notifications').insert([{
          user_id: selectedTicket.assigned_to,
          message: `New comment on your ticket: ${selectedTicket.title}`,
          link: '/dashboard/tickets'
        }]);
      }
      
      // Notify creator if commenter is not creator (and creator is not assigned user)
      if (selectedTicket.created_by && selectedTicket.created_by !== userId && selectedTicket.created_by !== selectedTicket.assigned_to) {
        await supabase.from('notifications').insert([{
          user_id: selectedTicket.created_by,
          message: `New comment on your ticket: ${selectedTicket.title}`,
          link: '/dashboard/tickets'
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_comments', selectedTicket?.id] });
      setNewComment('');
    }
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const createTicketMutation = useMutation({
    mutationFn: async (newTicket: any) => {
      const { data, error } = await supabase.from('direct_tickets').insert([newTicket]).select();
      if (error) throw error;
      
      if (newTicket.assigned_to && newTicket.assigned_to !== userId) {
        await supabase.from('notifications').insert([{
          user_id: newTicket.assigned_to,
          message: `You have been assigned a new ticket: ${newTicket.title}`,
          link: '/dashboard/tickets'
        }]);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct_tickets'] });
      resetForm();
      setIsRaiseModalOpen(false);
      setFormMessage({ type: 'success', text: 'Ticket raised successfully!' });
      setTimeout(() => setFormMessage(null), 3000);
    },
    onError: (error: any) => {
      setFormMessage({ type: 'error', text: error.message });
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, updates, title, oldAssignee }: { id: string, updates: any, title: string, oldAssignee: string | null }) => {
      const { error } = await supabase.from('direct_tickets').update(updates).eq('id', id);
      if (error) throw error;
      
      if (updates.assigned_to && updates.assigned_to !== oldAssignee && updates.assigned_to !== userId) {
        await supabase.from('notifications').insert([{
          user_id: updates.assigned_to,
          message: `A ticket was re-assigned to you: ${title}`,
          link: '/dashboard/tickets'
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct_tickets'] });
      setSelectedTicket(null);
      setFormMessage({ type: 'success', text: 'Ticket updated successfully!' });
      setTimeout(() => setFormMessage(null), 3000);
    },
    onError: (error: any) => {
      setFormMessage({ type: 'error', text: error.message });
    }
  });

  const handleRaiseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    if (!title.trim()) { setFormMessage({ type: 'error', text: 'Ticket title is required.' }); return; }
    
    createTicketMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      priority,
      assigned_to: assignedTo || null,
      created_by: userId
    });
  };

  const handleUpdateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    
    const originalTicket = tickets.find(t => t.id === selectedTicket.id);
    
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      updates: {
        priority: selectedTicket.priority,
        status: selectedTicket.status,
        assigned_to: selectedTicket.assigned_to || null,
        updated_at: new Date().toISOString()
      },
      title: selectedTicket.title,
      oldAssignee: originalTicket?.assigned_to || null
    });
  };

  if (!userId || ticketsLoading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 w-full">
        <Loader2 className="size-8 animate-spin text-slate-700" />
      </main>
    );
  }

  const filteredTickets = tickets.filter(t => {
    if (filter === 'Assigned to Me') return t.assigned_to === userId;
    if (filter === 'Raised by Me') return t.created_by === userId;
    return true;
  });

  const getPriorityColor = (p: string) => {
    if (p === 'High') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (p === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const getStatusColor = (s: string) => {
    if (s === 'Open') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'In Progress') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s === 'Resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-600 border-slate-300';
  };

  const getBorderColor = (s: string) => {
    if (s === 'Open') return 'border-l-blue-500';
    if (s === 'In Progress') return 'border-l-purple-500';
    if (s === 'Resolved') return 'border-l-emerald-500';
    return 'border-l-slate-400';
  };

  return (
    <main className="flex-1 w-full p-4 md:p-6 lg:p-8 relative text-slate-900 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Ticket className="size-7 text-indigo-600" />
            Direct Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Raise requests and assign tickets to anyone in the workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            {(['All', 'Assigned to Me', 'Raised by Me'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === f ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button onClick={() => setIsRaiseModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-bold">
            <Plus className="size-4" /> Raise Ticket
          </Button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {formMessage && (
          <MotionDiv initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`mb-6 p-4 rounded-xl border text-sm font-bold flex items-center gap-2 shadow-sm ${formMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {formMessage.type === 'success' ? <CheckCircle className="size-5 shrink-0" /> : <ShieldAlert className="size-5 shrink-0" />}
            <span>{formMessage.text}</span>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Tickets List */}
      <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTickets.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Ticket className="size-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No tickets found</h3>
            <p className="text-sm">There are no tickets matching this filter.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <MotionDiv key={ticket.id} variants={fadeInUp} onClick={() => setSelectedTicket(ticket)} className="relative group cursor-pointer h-full">
              <div className="absolute top-3 -right-2 -bottom-2 -left-2 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
              <div className={`relative z-10 bg-white rounded-xl border border-slate-200 border-l-4 ${getBorderColor(ticket.status)} shadow-sm transition-all duration-300 flex flex-col h-full`}>
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm border ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                    {ticket.priority === 'High' ? (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded shadow-sm border border-rose-100 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-rose-500 animate-pulse"></span>High
                      </span>
                    ) : (
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm border ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                    )}
                  </div>
                  
                  <h4 className="text-[15px] font-bold text-slate-900 leading-snug mt-1 group-hover:text-indigo-600 transition-colors line-clamp-2">{ticket.title}</h4>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 font-medium flex-1">
                    {ticket.description || <span className="italic text-slate-300">No description provided.</span>}
                  </p>

                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <Clock className="size-3.5" />
                      {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <div className="size-6 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-white shadow-sm" title={`Raised by: ${ticket.creator?.full_name}`}>
                        {ticket.creator?.avatar_url ? <img src={ticket.creator.avatar_url} className="size-full object-cover" alt="" /> : <User className="size-3.5 m-1.25 text-slate-400 ml-[5px] mt-[5px]" />}
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6"/></svg>
                      <div className="size-6 rounded-full bg-indigo-100 overflow-hidden shrink-0 border border-white shadow-sm" title={`Assigned to: ${ticket.assignee?.full_name || 'Unassigned'}`}>
                        {ticket.assignee?.avatar_url ? <img src={ticket.assignee.avatar_url} className="size-full object-cover" alt="" /> : <User className="size-3.5 m-1.25 text-indigo-400 ml-[5px] mt-[5px]" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </MotionDiv>
          ))
        )}
      </MotionDiv>

      {/* --- MODALS --- */}

      {/* Raise Ticket Modal */}
      <Modal isOpen={isRaiseModalOpen} onClose={() => setIsRaiseModalOpen(false)} title="Raise a New Ticket">
        <form onSubmit={handleRaiseTicket} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Ticket Subject / Title</Label>
            <Input required placeholder="Briefly describe the request..." value={title} onChange={(e) => setTitle(e.target.value)} disabled={createTicketMutation.isPending} className="font-medium h-11" />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Details (Optional)</Label>
            <textarea
              placeholder="Provide any additional context or requirements..."
              value={description} onChange={(e) => setDescription(e.target.value)} disabled={createTicketMutation.isPending}
              className="w-full min-h-[100px] p-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Priority</Label>
              <select
                value={priority} onChange={(e) => setPriority(e.target.value as any)} disabled={createTicketMutation.isPending}
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Assign To</Label>
              <select
                value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={createTicketMutation.isPending}
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              >
                <option value="">-- Unassigned --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-md" disabled={createTicketMutation.isPending}>
              {createTicketMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Raise Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit/Update Ticket Modal */}
      <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Update Ticket Status">
        {selectedTicket && (
          <>
            <form onSubmit={handleUpdateTicket} className="flex flex-col gap-4">
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-extrabold text-lg text-slate-900 mb-2">{selectedTicket.title}</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedTicket.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Status</Label>
                <select
                  value={selectedTicket.status} onChange={(e) => setSelectedTicket({...selectedTicket, status: e.target.value as any})} disabled={updateTicketMutation.isPending}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Priority</Label>
                <select
                  value={selectedTicket.priority} onChange={(e) => setSelectedTicket({...selectedTicket, priority: e.target.value as any})} disabled={updateTicketMutation.isPending}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Re-assign To</Label>
                <select
                  value={selectedTicket.assigned_to || ''} onChange={(e) => setSelectedTicket({...selectedTicket, assigned_to: e.target.value})} disabled={updateTicketMutation.isPending}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                >
                  <option value="">-- Unassigned --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-6 shadow-md" disabled={updateTicketMutation.isPending}>
                {updateTicketMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Save Updates
              </Button>
            </div>
          </form>
          
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h5 className="font-extrabold text-sm text-slate-900 mb-3 uppercase tracking-widest">Discussion</h5>
            
            <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2">
              {commentsLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl">No comments yet.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="size-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                      {comment.author?.avatar_url ? (
                        <img src={comment.author.avatar_url} className="size-full object-cover" alt="" />
                      ) : (
                        <User className="size-5 m-1.5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{comment.author?.full_name || 'Unknown User'}</span>
                        <span className="text-[10px] text-slate-400">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.comment_text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input 
                value={newComment} 
                onChange={e => setNewComment(e.target.value)} 
                placeholder="Write a comment..." 
                className="flex-1 bg-white"
                disabled={addCommentMutation.isPending}
              />
              <Button type="submit" disabled={!newComment.trim() || addCommentMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                {addCommentMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Post'}
              </Button>
            </form>
          </div>
          </>
        )}
      </Modal>

    </main>
  );
}
