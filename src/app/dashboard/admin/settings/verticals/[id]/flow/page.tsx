'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotionDiv, fadeInUp, staggerContainer } from '@/components/ui/motion';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Workflow, ChevronLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

type WorkflowStep = {
  id: number;
  vertical_id: number;
  user_id: string;
  order_index: number;
  user: { full_name: string; user_roles: { role: { name: string } }[] };
};

export default function VerticalFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const unwrappedParams = React.use(params);
  const verticalId = parseInt(unwrappedParams.id);

  const [selectedUser, setSelectedUser] = useState<string>('');

  const { data: vertical, isLoading: verticalLoading } = useQuery({
    queryKey: ['vertical', verticalId],
    queryFn: async () => {
      const { data, error } = await supabase.from('verticals').select('*').eq('id', verticalId).single();
      if (error) throw error;
      return data;
    }
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['profiles_with_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, user_roles(role:roles(name))').order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ['vertical_workflow_steps', verticalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_workflow_steps')
        .select('*, user:profiles(full_name, user_roles(role:roles(name)))')
        .eq('vertical_id', verticalId)
        .order('order_index', { ascending: true });
      if (error) {
        if (error.code === '42P01') return []; // Relation does not exist yet
        throw error;
      }
      return data as WorkflowStep[];
    }
  });

  const addStepMutation = useMutation({
    mutationFn: async ({ userId, orderIndex }: { userId: string, orderIndex?: number }) => {
      const nextOrder = orderIndex !== undefined 
        ? orderIndex 
        : (steps.length > 0 ? Math.max(...steps.map((s: any) => s.order_index)) + 1 : 0);
      const { error } = await supabase.from('vertical_workflow_steps').insert({
        vertical_id: verticalId,
        user_id: userId,
        order_index: nextOrder
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedUser('');
      queryClient.invalidateQueries({ queryKey: ['vertical_workflow_steps', verticalId] });
    }
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('vertical_workflow_steps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertical_workflow_steps', verticalId] });
    }
  });

  const reorderStepMutation = useMutation({
    mutationFn: async ({ stepGroup, direction }: { stepGroup: WorkflowStep[], direction: 'up' | 'down' }) => {
      // Find the group's current index among grouped steps
      const uniqueOrders = Array.from(new Set(steps.map((s: any) => s.order_index))).sort((a, b) => a - b);
      const currentIndex = uniqueOrders.indexOf(stepGroup[0].order_index);
      
      if (direction === 'up' && currentIndex > 0) {
        const prevOrder = uniqueOrders[currentIndex - 1];
        const prevGroup = steps.filter((s: any) => s.order_index === prevOrder);
        
        const upserts = [
          ...stepGroup.map(s => ({ ...s, user: undefined, order_index: prevOrder })),
          ...prevGroup.map(s => ({ ...s, user: undefined, order_index: stepGroup[0].order_index }))
        ];
        await supabase.from('vertical_workflow_steps').upsert(upserts);
      } else if (direction === 'down' && currentIndex < uniqueOrders.length - 1) {
        const nextOrder = uniqueOrders[currentIndex + 1];
        const nextGroup = steps.filter((s: any) => s.order_index === nextOrder);
        
        const upserts = [
          ...stepGroup.map(s => ({ ...s, user: undefined, order_index: nextOrder })),
          ...nextGroup.map(s => ({ ...s, user: undefined, order_index: stepGroup[0].order_index }))
        ];
        await supabase.from('vertical_workflow_steps').upsert(upserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertical_workflow_steps', verticalId] });
    }
  });

  const groupedSteps = React.useMemo(() => {
    const groups: Record<number, WorkflowStep[]> = {};
    steps.forEach((s: any) => {
      if (!groups[s.order_index]) groups[s.order_index] = [];
      groups[s.order_index].push(s);
    });
    return Object.values(groups).sort((a, b) => a[0].order_index - b[0].order_index);
  }, [steps]);

  const isLoading = verticalLoading || usersLoading || stepsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen p-3 text-slate-500 bg-slate-50">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto p-2 md:p-3 space-y-3 relative text-slate-900 bg-slate-50 min-h-screen">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-900/5 rounded-full blur-3xl -z-10" />

      <MotionDiv variants={fadeInUp} initial="initial" animate="animate">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/dashboard/admin/settings/verticals" className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-900">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Workflow className="size-6 text-slate-900" />
              Workflow for {vertical?.name}
            </h1>
            <p className="text-sm text-slate-500">Define the sequential role-based flow for tasks in this vertical. You can assign multiple users to the same step.</p>
          </div>
        </div>

        <Card className="bg-white border border-slate-100 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            
            <div className="flex flex-col md:flex-row gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-slate-500"
              >
                <option value="">Select a team member to add as new level...</option>
                {users.map((u: any) => {
                  const roleName = u.user_roles?.[0]?.role?.name || 'No Role';
                  return (
                    <option key={u.id} value={u.id}>{u.full_name} ({roleName})</option>
                  );
                })}
              </select>
              
              <button
                onClick={() => addStepMutation.mutate({ userId: selectedUser })}
                disabled={!selectedUser || addStepMutation.isPending}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="size-4" /> Add New Step
              </button>
            </div>

            {groupedSteps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm font-medium">
                No workflow steps configured for this vertical.
                <br />
                <span className="text-xs text-slate-400 font-normal">Add roles above to build your sequence.</span>
              </div>
            ) : (
              <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 pt-4">
                {groupedSteps.map((group, index) => (
                  <MotionDiv key={group[0].order_index} variants={fadeInUp} className="flex flex-col gap-2 relative">
                    {/* The connector line to next step */}
                    {index < groupedSteps.length - 1 && (
                      <div className="absolute left-6 top-10 bottom-[-32px] w-0.5 bg-slate-200 z-0"></div>
                    )}
                    
                    <div className="flex items-start gap-3 group/level">
                      {/* Step Number Circle */}
                      <div className="size-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black z-10 shrink-0 shadow-md mt-1">
                        {index + 1}
                      </div>

                      <div className="flex-1 flex flex-col gap-2 p-3 bg-slate-50/80 border border-slate-200 rounded-xl shadow-sm z-10">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Level {index + 1}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/level:opacity-100 transition-opacity">
                            <button 
                              onClick={() => reorderStepMutation.mutate({ stepGroup: group, direction: 'up' })}
                              disabled={index === 0 || reorderStepMutation.isPending}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
                              title="Move entire level up"
                            >
                              <ArrowUp className="size-3" />
                            </button>
                            <button 
                              onClick={() => reorderStepMutation.mutate({ stepGroup: group, direction: 'down' })}
                              disabled={index === groupedSteps.length - 1 || reorderStepMutation.isPending}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
                              title="Move entire level down"
                            >
                              <ArrowDown className="size-3" />
                            </button>
                          </div>
                        </div>

                        {/* Parallel Users */}
                        <div className="flex flex-wrap gap-2">
                          {group.map(step => (
                            <div key={step.id} className="flex-1 min-w-[200px] flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 tracking-wide uppercase truncate" title={step.user?.full_name || 'Unknown User'}>
                                  {step.user?.full_name || 'Unknown User'}
                                </div>
                                <div className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                                  {step.user?.user_roles?.[0]?.role?.name || 'No Role'}
                                </div>
                              </div>

                              <button 
                                onClick={() => { if(confirm('Remove this user from the workflow step?')) deleteStepMutation.mutate(step.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add Parallel User */}
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            id={`add-parallel-${group[0].order_index}`}
                            className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs shadow-sm focus:outline-none focus:border-slate-500 max-w-[200px]"
                          >
                            <option value="">+ Add parallel user...</option>
                            {users
                              .filter((u: any) => !group.some(s => s.user_id === u.id))
                              .map((u: any) => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                              ))
                            }
                          </select>
                          <button
                            onClick={() => {
                              const selectEl = document.getElementById(`add-parallel-${group[0].order_index}`) as HTMLSelectElement;
                              if (selectEl?.value) {
                                addStepMutation.mutate({ userId: selectEl.value, orderIndex: group[0].order_index });
                                selectEl.value = '';
                              }
                            }}
                            className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                      </div>
                    </div>
                  </MotionDiv>
                ))}
              </MotionDiv>
            )}
          </CardContent>
        </Card>
      </MotionDiv>
    </main>
  );
}
