'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotionDiv, fadeInUp, staggerContainer } from '@/components/ui/motion';
import { Loader2, Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, ListTodo } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DefaultMiniTask = {
  id: number;
  title: string;
  description: string | null;
  order_index: number;
};

export default function MiniTasksSettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const { data: miniTasks = [], isLoading } = useQuery({
    queryKey: ['default_mini_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_mini_tasks')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) {
        if (error.code === '42P01') return []; // Relation does not exist yet
        throw error;
      }
      return data as DefaultMiniTask[];
    }
  });

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      const nextOrder = miniTasks.length > 0 ? Math.max(...miniTasks.map(t => t.order_index)) + 1 : 0;
      const { error } = await supabase.from('default_mini_tasks').insert({
        title: newTaskTitle,
        description: newTaskDesc || null,
        order_index: nextOrder
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTaskTitle('');
      setNewTaskDesc('');
      queryClient.invalidateQueries({ queryKey: ['default_mini_tasks'] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, title, description }: { id: number, title: string, description: string | null }) => {
      const { error } = await supabase.from('default_mini_tasks').update({ title, description }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['default_mini_tasks'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('default_mini_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default_mini_tasks'] });
    }
  });

  const reorderTaskMutation = useMutation({
    mutationFn: async ({ task, direction }: { task: DefaultMiniTask, direction: 'up' | 'down' }) => {
      const currentIndex = miniTasks.findIndex(t => t.id === task.id);
      if (direction === 'up' && currentIndex > 0) {
        const prevTask = miniTasks[currentIndex - 1];
        await supabase.from('default_mini_tasks').upsert([
          { ...task, order_index: prevTask.order_index },
          { ...prevTask, order_index: task.order_index }
        ]);
      } else if (direction === 'down' && currentIndex < miniTasks.length - 1) {
        const nextTask = miniTasks[currentIndex + 1];
        await supabase.from('default_mini_tasks').upsert([
          { ...task, order_index: nextTask.order_index },
          { ...nextTask, order_index: task.order_index }
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default_mini_tasks'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-3 text-slate-500">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ListTodo className="size-7 text-indigo-600" />
            Manage Default Mini Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the default mini tasks that are automatically added when a new task is created.
          </p>
        </div>
      </div>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-900/5 rounded-full blur-3xl -z-10" />

      <MotionDiv variants={fadeInUp} initial="initial" animate="animate" className="max-w-5xl space-y-4">
            
            <div className="flex flex-col md:flex-row gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New mini task title..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-slate-500"
              />
              <input
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Default description (optional)"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-slate-500 text-slate-600"
              />
              <button
                onClick={() => addTaskMutation.mutate()}
                disabled={!newTaskTitle || addTaskMutation.isPending}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="size-4" /> Add Task
              </button>
            </div>

            {miniTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm font-medium">
                No default mini tasks configured yet.
                <br />
                <span className="text-xs text-slate-400 font-normal">(Please run the SQL migration if you haven't already!)</span>
              </div>
            ) : (
              <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
                {miniTasks.map((task, index) => (
                  <MotionDiv key={task.id} variants={fadeInUp} className="relative group">
                    <div className="absolute top-2 -right-1 -bottom-1 -left-1 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-[6px] transition-all duration-500 z-0"></div>
                    <Card className="relative z-10 bg-white border border-slate-200 shadow-sm transition-all duration-300 flex flex-row items-center gap-4 p-4 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => reorderTaskMutation.mutate({ task, direction: 'up' })}
                        disabled={index === 0 || reorderTaskMutation.isPending}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button 
                        onClick={() => reorderTaskMutation.mutate({ task, direction: 'down' })}
                        disabled={index === miniTasks.length - 1 || reorderTaskMutation.isPending}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>

                    <div className="flex-1 flex items-center min-w-0">
                      {editingId === task.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input 
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="text-sm font-bold bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500 w-1/3 min-w-[150px]"
                            placeholder="Task title"
                            autoFocus
                          />
                          <input 
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500 flex-1 min-w-[150px] text-slate-600"
                            placeholder="Description (optional)"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-sm font-bold text-slate-800 whitespace-nowrap min-w-[200px]">{task.title}</span>
                          {task.description && <span className="text-xs text-slate-500 truncate flex-1">{task.description}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {editingId === task.id ? (
                        <>
                          <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors">
                            <X className="size-4" />
                          </button>
                          <button 
                            onClick={() => updateTaskMutation.mutate({ id: task.id, title: editTitle, description: editDesc || null })}
                            disabled={!editTitle || updateTaskMutation.isPending}
                            className="p-1.5 hover:bg-slate-900 hover:text-white bg-slate-100 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Check className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingId(task.id);
                              setEditTitle(task.title);
                              setEditDesc(task.description || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button 
                            onClick={() => { if(confirm('Are you sure you want to delete this default mini task?')) deleteTaskMutation.mutate(task.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                    </Card>
                  </MotionDiv>
                ))}
              </MotionDiv>
            )}
      </MotionDiv>
    </main>
  );
}
