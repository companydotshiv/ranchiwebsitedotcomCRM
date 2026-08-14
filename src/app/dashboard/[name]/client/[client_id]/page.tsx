'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Building2, User, Link as LinkIcon, CheckCircle2, UserPlus, MapPin, Briefcase, Target, Phone, Mail, Calendar, FileText, Settings, Rocket, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Send } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MotionDiv, staggerContainer, fadeInUp } from '@/components/ui/motion';

import ClientTaskManager from './ClientTaskManager';

export default function ClientDetailsPage() {
  const params = useParams();
  const clientId = params.client_id as string;
  const verticalName = params.name as string;
  const supabase = createClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: allVerticals } = useQuery({
    queryKey: ['allVerticals'],
    queryFn: async () => {
      const { data } = await supabase.from('verticals').select('*').order('name');
      return data || [];
    }
  });

  const { data: clientVerticals } = useQuery({
    queryKey: ['clientVerticals', clientId],
    queryFn: async () => {
      const { data } = await supabase.from('client_verticals').select('vertical_id').eq('client_id', clientId);
      return data?.map(d => d.vertical_id) || [];
    },
    enabled: !!clientId
  });

  const assignMutation = useMutation({
    mutationFn: async (selectedVerticalIds: number[]) => {
      await supabase.from('client_verticals').delete().eq('client_id', clientId);
      if (selectedVerticalIds.length > 0) {
        const inserts = selectedVerticalIds.map(vid => ({ client_id: parseInt(clientId), vertical_id: vid }));
        await supabase.from('client_verticals').insert(inserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientVerticals', clientId] });
      queryClient.invalidateQueries({ queryKey: ['verticalClients'] });
      setIsAssignModalOpen(false);
    }
  });

  const AssignVerticalsModal = () => {
    const [selected, setSelected] = useState<number[]>(clientVerticals || []);
    
    const toggleSelection = (id: number) => {
      if (selected.includes(id)) {
        setSelected(selected.filter(x => x !== id));
      } else {
        setSelected([...selected, id]);
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Send className="size-5 text-slate-900" />
              Assign Verticals
            </h3>
            <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
              <X className="size-5" />
            </button>
          </div>
          <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
            {allVerticals?.map((v: any) => {
              const isSelected = selected.includes(v.id);
              return (
                <label key={v.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-slate-500 bg-slate-100 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleSelection(v.id)} />
                  <div className={`size-5 rounded border flex items-center justify-center ${isSelected ? 'bg-slate-900 border-emerald-600' : 'border-slate-300'}`}>
                    {isSelected && <CheckCircle2 className="size-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">{v.name}</div>
                    {v.description && <div className="text-xs text-slate-500">{v.description}</div>}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
             <button onClick={() => setIsAssignModalOpen(false)} className="px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
             <button onClick={() => assignMutation.mutate(selected)} disabled={assignMutation.isPending} className="px-3 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2">
               {assignMutation.isPending && <Loader2 className="size-4 animate-spin" />}
               Save Assignments
             </button>
          </div>
        </div>
      </div>
    );
  };

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
      if (error && error.code !== '42P01') throw error;
      return data;
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-3">
        <Loader2 className="size-8 animate-spin text-slate-700" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="w-full h-full p-3 flex flex-col items-center justify-center text-center">
        <Building2 className="size-16 text-slate-300 mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Client Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">The requested client details could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2 md:p-3 bg-slate-50 min-h-[calc(100vh-64px)] flex flex-col">
      <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="w-full flex-1 flex flex-col gap-2">
        
        {/* Unified Client Card */}
        <MotionDiv variants={fadeInUp} className="bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none z-0"></div>
          
          {/* Header (Always Visible, Clickable) */}
          <div 
            className="flex flex-row items-center justify-between gap-2 px-3 py-2 relative z-10 w-full cursor-pointer hover:bg-slate-50/50 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex flex-row items-center gap-2 w-full">
              <div className="size-12 rounded-lg border border-slate-100 bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {client.business_logo_url ? (
                  <img src={client.business_logo_url} alt={client.business_name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 className="size-6 text-slate-900/30" />
                )}
              </div>
              
              <div className="flex flex-row items-center flex-wrap gap-2 flex-1">
                <h1 className="text-base md:text-lg font-extrabold tracking-tight text-slate-900">{client.business_name}</h1>
                <span className="text-slate-300">|</span>
                <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                  <User className="size-3.5 text-slate-900" /> {client.client_name}
                </p>
                <span className="text-slate-300">|</span>
                {client.phone_numbers?.length > 0 && client.phone_numbers.map((phone: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-md text-sm font-bold transition-colors border border-slate-100 shadow-sm">
                    <Phone className="size-3.5 text-slate-400" /> {phone}
                  </span>
                ))}
                {client.emails?.length > 0 && client.emails.map((email: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-md text-sm font-bold transition-colors border border-slate-100 shadow-sm">
                    <Mail className="size-3.5 text-slate-400" /> {email}
                  </span>
                ))}
              </div>

              <div className="flex-shrink-0 flex items-center gap-2">
                {verticalName === 'sales' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsAssignModalOpen(true); }}
                    className="bg-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-200 transition-colors flex items-center gap-1.5"
                  >
                    <Send className="size-3.5" /> Assign Vertical
                  </button>
                )}
                <div className="bg-slate-50 text-slate-500 p-1.5 rounded-lg transition-colors border border-slate-100 hover:bg-slate-100">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>
          </div>

          {verticalName === 'sales' && isAssignModalOpen && <AssignVerticalsModal />}

          {/* Expanded Content */}
          {isExpanded && (
            <div className="p-3 md:p-3 pt-0 border-t border-slate-100 relative z-10 animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 pt-6">
                
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-2">
                  
                  {/* Contacts & POCs */}
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <UserPlus className="size-5 text-slate-900" /> Points of Contact
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Business Side (Client)</h4>
                        <div className="space-y-2">
                          {client.poc_business?.length ? client.poc_business.map((p: any, i: number) => (
                            <div key={i} className="flex flex-col bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                              <span className="font-bold text-slate-800 text-sm">{p.name || '-'}</span> 
                              {p.phone && <span className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1"><Phone className="size-3" /> {p.phone}</span>}
                            </div>
                          )) : <span className="text-sm text-slate-400 italic">No POCs added.</span>}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Our Side (Internal Team)</h4>
                        <div className="space-y-2">
                          {client.poc_our_side?.length ? client.poc_our_side.map((p: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                              <User className="size-4 text-slate-500" />
                              <span className="font-bold text-slate-900 text-sm">{p}</span>
                            </div>
                          )) : <span className="text-sm text-slate-400 italic">No team members assigned.</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Profile & Market Analysis */}
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target className="size-5 text-slate-900" /> Market Analysis & Strategy
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><Briefcase className="size-3" /> Industry</span>
                          <p className="text-sm font-bold text-slate-800">{client.industry || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><MapPin className="size-3" /> Target Location</span>
                          <p className="text-sm font-bold text-slate-800">{client.target_location || '-'}</p>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1.5"><Settings className="size-3" /> Products / Services Offered</span>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{client.products_services_offered || '-'}</p>
                      </div>

                      <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest block mb-3 flex items-center gap-1.5"><Rocket className="size-3" /> Unique Selling Proposition (USP)</span>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">{client.usp || '-'}</p>
                      </div>
                    </div>
                  </div>
                  
                </div>

                {/* Right Column (Sidebar metrics) */}
                <div className="space-y-2">
                  
                  {/* Timeline & Services */}
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Calendar className="size-5 text-slate-900" /> Timeline & Services
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Date of Onboarding</span>
                        <p className="text-sm font-extrabold text-slate-800">
                          {client.date_of_onboarding ? new Date(client.date_of_onboarding).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Date Work Started</span>
                        <p className="text-sm font-extrabold text-slate-900">
                          {client.date_work_started ? new Date(client.date_work_started).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Provided Services</span>
                        <div className="flex flex-col gap-2">
                          {client.provided_services?.length ? client.provided_services.map((s: string, i: number) => (
                            <span key={i} className="text-sm font-bold bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2">
                              <CheckCircle2 className="size-4 text-slate-700" /> {s}
                            </span>
                          )) : <span className="text-sm text-slate-400 italic">-</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Goals */}
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target className="size-4 text-slate-700" /> Business Goals
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {client.business_goals?.length ? client.business_goals.map((g: string, i: number) => (
                        <span key={i} className="text-xs font-bold bg-white text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                          {g}
                        </span>
                      )) : <span className="text-sm text-slate-400 italic">-</span>}
                    </div>
                  </div>

                  {/* Custom Notes */}
                  {client.custom_notes && (
                    <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileText className="size-5 text-slate-900" /> Custom Instructions
                      </h3>
                      <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed font-medium">
                        {client.custom_notes}
                      </p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

        </MotionDiv>

        {/* Task Manager Component replacing the hardcoded calendar */}
        <MotionDiv variants={fadeInUp} className="w-full flex-1 flex flex-col min-h-[500px]">
          <ClientTaskManager 
            clientId={clientId} 
            clientData={{
              ...client,
              vertical_id: allVerticals?.find((v: any) => v.name.toLowerCase() === verticalName.toLowerCase())?.id
            }} 
          />
        </MotionDiv>

      </MotionDiv>
    </div>
  );
}
