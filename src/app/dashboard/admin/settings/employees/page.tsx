'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MotionDiv, fadeInUp, staggerContainer } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';
import {
  Users, Loader2, CheckCircle, ShieldAlert,
  Phone, Mail, Plus, Pencil, Trash2, X, Check
} from 'lucide-react';

interface Role {
  id: number;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  workspace_role_ids: number[];
  status?: 'active' | 'inactive';
  created_at: string;
  role: string; // System role (admin/user)
}

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

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form states
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empBirthday, setEmpBirthday] = useState('');
  const [empRoleIds, setEmpRoleIds] = useState<number[]>([]);
  
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editRoleIds, setEditRoleIds] = useState<number[]>([]);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      else router.push('/login');
    };
    getUser();
  }, [router]);

  // Fetch Roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('id, name').order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch Employees from new API
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!userId,
  });

  const resetAddForm = () => {
    setEmpName(''); setEmpEmail(''); setEmpPhone(''); setEmpBirthday(''); setEmpRoleIds([]);
  };

  const createEmployeeMutation = useMutation({
    mutationFn: async (newEmp: { name: string; email: string; phone: string; workspaceRoleIds: number[]; date_of_birth: string }) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      resetAddForm();
      setIsAddModalOpen(false);
      setFormMessage({ type: 'success', text: 'Employee invited successfully! They will receive an email.' });
      setTimeout(() => setFormMessage(null), 4000);
    },
    onError: (error: any) => {
      setFormMessage({ type: 'error', text: error.message });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (updated: { id: string; name: string; email: string; phone: string; workspaceRoleIds: number[]; date_of_birth: string }) => {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingId(null);
      setFormMessage({ type: 'success', text: 'Employee updated successfully!' });
      setTimeout(() => setFormMessage(null), 3000);
    },
    onError: (error: any) => setFormMessage({ type: 'error', text: error.message }),
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeletingId(null);
    },
    onError: (error: any) => {
      setFormMessage({ type: 'error', text: error.message });
      setDeletingId(null);
    },
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    if (!empName.trim()) { setFormMessage({ type: 'error', text: 'Name is required.' }); return; }
    if (!empEmail.trim()) { setFormMessage({ type: 'error', text: 'Email is required.' }); return; }
    createEmployeeMutation.mutate({
      name: empName.trim(),
      email: empEmail.trim(),
      phone: empPhone.trim(),
      date_of_birth: empBirthday,
      workspaceRoleIds: empRoleIds,
    });
  };

  const startEdit = (emp: Employee) => {
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditPhone(emp.phone || '');
    setEditBirthday(emp.date_of_birth || '');
    setEditRoleIds(emp.workspace_role_ids || []);
    setEditingId(emp.id);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateEmployeeMutation.mutate({
      id: editingId!,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      date_of_birth: editBirthday,
      workspaceRoleIds: editRoleIds,
    });
  };

  if (!userId || employeesLoading) {
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
            <Users className="size-7 text-indigo-600" />
            Manage Workspace Employees
          </h1>
          <p className="text-sm text-slate-500 mt-1">Invite and manage team members within your organization.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Plus className="size-4" /> Invite Employee
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

      {/* Employees List */}
      <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-3">
        {employees.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Users className="size-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium">No employees found.</p>
          </div>
        ) : (
          employees.map((emp) => (
            <MotionDiv key={emp.id} variants={fadeInUp} className="relative group">
              <div className="absolute top-2 -right-1 -bottom-1 -left-1 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-[6px] transition-all duration-500 z-0"></div>
              <Card className="relative z-10 bg-white border border-slate-200 shadow-sm transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between overflow-hidden p-4 gap-4">
              
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className={`inline-flex shrink-0 items-center justify-center size-10 rounded-full font-bold text-white shadow-sm ${emp.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
                  {emp.name.charAt(0).toUpperCase()}
                </span>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-extrabold text-slate-900 truncate">{emp.name}</h3>
                    {emp.role === 'admin' && (
                      <span className="inline-flex shrink-0 items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">Workspace Admin</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 shrink-0 truncate">
                      <Mail className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Phone className="size-3.5 text-slate-400" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  {emp.workspace_role_ids?.length > 0 ? (
                    emp.workspace_role_ids.map(rid => {
                      const roleObj = roles.find(r => r.id === rid);
                      return (
                        <span key={rid} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/50 truncate max-w-[120px]">
                          {roleObj ? roleObj.name : `Role #${rid}`}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No roles</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-4 ml-2">
                  <button
                    onClick={() => startEdit(emp)}
                    className="inline-flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm h-8"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </button>
                  
                  {deletingId === emp.id ? (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100 h-8">
                      <button onClick={() => deleteEmployeeMutation.mutate(emp.id)} className="p-1 rounded text-red-600 hover:bg-red-100"><Check className="size-3.5" /></button>
                      <button onClick={() => setDeletingId(null)} className="p-1 rounded text-slate-500 hover:bg-slate-200"><X className="size-3.5" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(emp.id)}
                      className="inline-flex justify-center items-center p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors h-8 border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              </Card>
            </MotionDiv>
          ))
        )}
      </MotionDiv>

      {/* --- MODALS --- */}

      {/* Add Employee Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Invite Employee">
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Full Name</Label>
            <Input required placeholder="Jane Doe" value={empName} onChange={(e) => setEmpName(e.target.value)} disabled={createEmployeeMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Email Address</Label>
            <Input required type="email" placeholder="jane@example.com" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} disabled={createEmployeeMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Phone Number (Optional)</Label>
            <Input type="tel" placeholder="+1 555-0123" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} disabled={createEmployeeMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Date of Birth (Optional)</Label>
            <Input type="date" value={empBirthday} onChange={(e) => setEmpBirthday(e.target.value)} disabled={createEmployeeMutation.isPending} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Assign Roles</Label>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
              {roles.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">No roles available. Create some in Manage Roles first.</p>
              ) : (
                roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md cursor-pointer">
                    <input type="checkbox" checked={empRoleIds.includes(role.id)} onChange={(e) => {
                      const newRoles = e.target.checked ? [...empRoleIds, role.id] : empRoleIds.filter(id => id !== role.id);
                      setEmpRoleIds(newRoles);
                    }} className="rounded border-slate-300" />
                    <span className="text-sm font-bold text-slate-900">{role.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <Button type="submit" className="w-full font-bold shadow-md" disabled={createEmployeeMutation.isPending}>
            {createEmployeeMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Invite Employee
          </Button>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal isOpen={editingId !== null} onClose={() => setEditingId(null)} title="Edit Employee">
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Full Name</Label>
            <Input required value={editName} onChange={(e) => setEditName(e.target.value)} disabled={updateEmployeeMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Email Address</Label>
            <Input required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={updateEmployeeMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Phone Number</Label>
            <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={updateEmployeeMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Date of Birth</Label>
            <Input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} disabled={updateEmployeeMutation.isPending} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Assign Roles</Label>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md cursor-pointer">
                  <input type="checkbox" checked={editRoleIds.includes(role.id)} onChange={(e) => {
                    const newRoles = e.target.checked ? [...editRoleIds, role.id] : editRoleIds.filter(id => id !== role.id);
                    setEditRoleIds(newRoles);
                  }} className="rounded border-slate-300" />
                  <span className="text-sm font-bold text-slate-900">{role.name}</span>
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full font-bold shadow-md" disabled={updateEmployeeMutation.isPending}>
            {updateEmployeeMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Save Changes
          </Button>
        </form>
      </Modal>

    </main>
  );
}
