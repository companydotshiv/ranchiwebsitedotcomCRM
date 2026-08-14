'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, staggerContainer, fadeInUp } from '@/components/ui/motion';
import { Loader2, Plus, Pencil, Trash2, X, CheckCircle, ShieldAlert, Check, Layers, Workflow } from 'lucide-react';
import Link from 'next/link';

interface Vertical {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

const PROTECTED_VERTICALS = ['Finance', 'Sales', 'HR'];

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><X className="size-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function VerticalsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form states
  const [verticalName, setVerticalName] = useState('');
  const [verticalDescription, setVerticalDescription] = useState('');
  
  // Edit states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Fetch verticals
  const { data: verticals = [], isLoading: verticalsLoading } = useQuery<Vertical[]>({
    queryKey: ['verticals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('verticals').select('*').order('name');
      if (error) {
        if (error.code === '42P01') {
          console.warn('Verticals table does not exist yet. Please run the SQL schema update.');
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: !!userId,
  });

  const resetAddForm = () => {
    setVerticalName('');
    setVerticalDescription('');
  };

  // Create Mutation
  const createVerticalMutation = useMutation({
    mutationFn: async (newVertical: { name: string; description: string }) => {
      const { error } = await supabase.from('verticals').insert([newVertical]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verticals'] });
      resetAddForm();
      setIsAddModalOpen(false);
      setFormMessage({ type: 'success', text: 'Vertical created successfully!' });
      setTimeout(() => setFormMessage(null), 3000);
    },
    onError: (error: any) => setFormMessage({ type: 'error', text: error.message }),
  });

  // Update Mutation
  const updateVerticalMutation = useMutation({
    mutationFn: async (updated: { id: number; name: string; description: string }) => {
      const { error } = await supabase.from('verticals').update({ name: updated.name, description: updated.description }).eq('id', updated.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verticals'] });
      setEditingId(null);
      setFormMessage({ type: 'success', text: 'Vertical updated successfully!' });
      setTimeout(() => setFormMessage(null), 3000);
    },
    onError: (error: any) => setFormMessage({ type: 'error', text: error.message }),
  });

  // Delete Mutation
  const deleteVerticalMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('verticals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verticals'] });
      setDeletingId(null);
    },
    onError: (error: any) => {
      setFormMessage({ type: 'error', text: error.message || 'Failed to delete vertical.' });
      setDeletingId(null);
    },
  });

  const handleCreateVertical = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verticalName.trim()) return;
    createVerticalMutation.mutate({ name: verticalName.trim(), description: verticalDescription.trim() });
  };

  const startEdit = (vertical: Vertical) => {
    setEditName(vertical.name);
    setEditDescription(vertical.description ?? '');
    setEditingId(vertical.id);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateVerticalMutation.mutate({ id: editingId!, name: editName.trim(), description: editDescription.trim() });
  };

  if (!userId || verticalsLoading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-3 bg-slate-50 text-slate-900 min-h-screen w-full">
        <Loader2 className="size-8 animate-spin text-slate-700" />
      </main>
    );
  }

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="size-7 text-indigo-600" />
            Manage Business Verticals
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure CRM verticals like Sales, SMM, and Ecommerce to segment projects and teams.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Plus className="size-4" /> Add Vertical
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {formMessage && (
          <MotionDiv
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-2 shadow-sm ${formMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
          >
            {formMessage.type === 'success' ? <CheckCircle className="size-5 shrink-0" /> : <ShieldAlert className="size-5 shrink-0" />}
            <span>{formMessage.text}</span>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Verticals Grid */}
      <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {verticals.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Layers className="size-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium">No verticals defined yet.</p>
          </div>
        ) : (
          verticals.map((vertical) => {
            const isProtected = PROTECTED_VERTICALS.some(p => p.toLowerCase() === vertical.name.toLowerCase());
            
            return (
              <MotionDiv key={vertical.id} variants={fadeInUp} className="relative group h-full">
                <div className="absolute top-3 -right-2 -bottom-2 -left-2 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-2xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-sm transition-all duration-500 z-0"></div>
                <Card className="relative z-10 bg-white border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden transition-all duration-300">
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50 shadow-inner">
                        <Layers className="size-6 text-indigo-600" />
                      </div>
                      <div className="flex gap-2">
                        {isProtected && <span className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-amber-50 border border-amber-100 text-amber-600 font-bold text-[11px] uppercase tracking-wider">System</span>}
                        <span className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-slate-50 border border-slate-100 text-slate-500 font-mono text-[11px] font-bold tracking-wider">#{vertical.id}</span>
                      </div>
                    </div>
                    
                    <h3 className="font-extrabold text-xl text-slate-900 tracking-tight mb-1">{vertical.name}</h3>
                    
                    <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[40px] leading-relaxed">
                      {vertical.description || <span className="italic text-slate-400">No description provided for this vertical.</span>}
                    </p>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 group-hover:bg-slate-50 transition-colors">
                    <Link href={`/dashboard/admin/settings/verticals/${vertical.id}/flow`} className="flex-1 md:flex-none">
                      <Button size="sm" className="w-full text-xs font-extrabold text-white bg-slate-900 hover:bg-indigo-600 transition-colors shadow-sm h-9 px-4 gap-2 rounded-xl">
                        <Workflow className="size-4" /> Configure Flow
                      </Button>
                    </Link>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(vertical)}
                        className="inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      
                      {deletingId === vertical.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100">
                          <button onClick={() => deleteVerticalMutation.mutate(vertical.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 font-bold text-xs flex items-center gap-1 px-2"><Check className="size-3.5" /> Confirm</button>
                          <button onClick={() => setDeletingId(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"><X className="size-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => !isProtected && setDeletingId(vertical.id)}
                          disabled={isProtected}
                          className={`inline-flex justify-center items-center p-2 rounded-xl border shadow-sm transition-colors ${isProtected ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
                          title={isProtected ? "System vertical cannot be deleted" : "Delete vertical"}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </MotionDiv>
            );
          })
        )}
      </MotionDiv>

      {/* --- MODALS --- */}

      {/* Add Vertical Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Vertical">
        <form onSubmit={handleCreateVertical} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Vertical Name</Label>
            <Input required placeholder="e.g. Sales, Real Estate" value={verticalName} onChange={(e) => setVerticalName(e.target.value)} disabled={createVerticalMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Description</Label>
            <Input placeholder="Optional description..." value={verticalDescription} onChange={(e) => setVerticalDescription(e.target.value)} disabled={createVerticalMutation.isPending} />
          </div>
          <Button type="submit" className="w-full font-bold shadow-md" disabled={createVerticalMutation.isPending}>
            {createVerticalMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Create Vertical
          </Button>
        </form>
      </Modal>

      {/* Edit Vertical Modal */}
      <Modal isOpen={editingId !== null} onClose={() => setEditingId(null)} title="Edit Vertical">
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Vertical Name</Label>
            <Input required value={editName} onChange={(e) => setEditName(e.target.value)} disabled={updateVerticalMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Description</Label>
            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} disabled={updateVerticalMutation.isPending} />
          </div>
          <Button type="submit" className="w-full font-bold shadow-md" disabled={updateVerticalMutation.isPending}>
            {updateVerticalMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Save Changes
          </Button>
        </form>
      </Modal>

    </main>
  );
}
