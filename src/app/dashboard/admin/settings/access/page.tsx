'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MotionDiv, staggerContainer, fadeInUp } from '@/components/ui/motion';
import { Shield, Loader2, Search, CheckCircle, X, ShieldAlert, Check } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const PERMISSIONS_DEF = [
  { key: 'manage_clients', label: 'Manage Clients', desc: 'Create, edit, and delete clients and their verticals.' },
  { key: 'manage_tasks', label: 'Manage Tasks', desc: 'Create, assign, edit, and delete tasks and mini tasks.' },
  { key: 'manage_users', label: 'Manage Users', desc: 'Manage users, view attendance and HR leaves.' },
  { key: 'manage_settings', label: 'Admin Access', desc: 'Full access to Admin features and User Access Control.' },
] as const;

interface Profile {
  id: string;
  full_name: string;
  role: string;
  user_roles: {
    role_id: number;
    role: { name: string; permissions: any };
  }[];
}

interface Vertical {
  id: number;
  name: string;
}

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
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

export default function AccessControlPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editPerms, setEditPerms] = useState<any>({});
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check auth
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
    };
    checkUser();
  }, [router]);

  const { data: users = [], isLoading: usersLoading } = useQuery<Profile[]>({
    queryKey: ['access_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, user_roles(role_id, role:roles(name, permissions))')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data as unknown as Profile[]) || [];
    }
  });

  const { data: verticals = [] } = useQuery<Vertical[]>({
    queryKey: ['verticals_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('verticals').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, perms }: { userId: string, perms: any }) => {
      const profileName = `AccessProfile-${userId}`;
      
      // Check if this specific user role exists
      const { data: existingRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', profileName)
        .maybeSingle();

      let roleId = existingRole?.id;

      if (!roleId) {
        // Create new role specifically for this user
        const { data: newRole, error: roleErr } = await supabase
          .from('roles')
          .insert([{ name: profileName, description: `Custom access for ${userId}`, permissions: perms }])
          .select('id')
          .single();
        
        if (roleErr) throw roleErr;
        roleId = newRole.id;
      } else {
        // Update existing role
        const { error: updErr } = await supabase
          .from('roles')
          .update({ permissions: perms })
          .eq('id', roleId);
        if (updErr) throw updErr;
      }

      // First, remove existing roles to prevent conflicts
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Now assign this unique role
      const { error: assignErr } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role_id: roleId }]);
      if (assignErr) throw assignErr;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access_profiles'] });
      setFormMessage({ type: 'success', text: 'User access updated successfully.' });
      setTimeout(() => {
        setSelectedUser(null);
        setFormMessage(null);
      }, 1500);
    },
    onError: (error: any) => {
      setFormMessage({ type: 'error', text: error.message || 'Failed to update access.' });
    }
  });

  const handleEditAccess = (user: Profile) => {
    setSelectedUser(user);
    setFormMessage(null);
    
    // Attempt to parse existing permissions by merging them
    let mergedPerms: any = {
      manage_clients: false, manage_tasks: false, manage_users: false, manage_settings: false, allowed_verticals: []
    };

    if (user.user_roles && user.user_roles.length > 0) {
      user.user_roles.forEach((ur) => {
        if (ur.role?.permissions) {
          mergedPerms.manage_clients = mergedPerms.manage_clients || ur.role.permissions.manage_clients;
          mergedPerms.manage_tasks = mergedPerms.manage_tasks || ur.role.permissions.manage_tasks;
          mergedPerms.manage_users = mergedPerms.manage_users || ur.role.permissions.manage_users;
          mergedPerms.manage_settings = mergedPerms.manage_settings || ur.role.permissions.manage_settings;
          
          if (ur.role.permissions.allowed_verticals) {
            mergedPerms.allowed_verticals = Array.from(new Set([...mergedPerms.allowed_verticals, ...ur.role.permissions.allowed_verticals]));
          }
        }
      });
    }
    
    setEditPerms(mergedPerms);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    updatePermissionsMutation.mutate({ userId: selectedUser.id, perms: editPerms });
  };

  const toggleVertical = (vId: number) => {
    setEditPerms((prev: any) => {
      const current = prev.allowed_verticals || [];
      if (current.includes(vId)) {
        return { ...prev, allowed_verticals: current.filter((id: number) => id !== vId) };
      } else {
        return { ...prev, allowed_verticals: [...current, vId] };
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="size-8 text-rose-500" />
            User Access Control
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Centrally manage permissions for all users to prevent feature overlap.</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..." 
              className="pl-9 bg-white border-slate-200 rounded-xl focus-visible:ring-rose-500"
            />
          </div>
        </div>
        
        {usersLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="size-8 animate-spin text-slate-400" /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No users found.</div>
            ) : (
              filteredUsers.map(user => {
                // Determine if they have admin/key features quickly to display badges
                let hasAdmin = false;
                if (user.user_roles) {
                  user.user_roles.forEach(ur => {
                    if (ur.role?.permissions?.manage_settings) hasAdmin = true;
                  });
                }

                return (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-bold shrink-0">
                        {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {user.full_name || 'Unknown'}
                          {hasAdmin && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">Admin</span>}
                        </div>
                        <div className="text-xs text-slate-500">Job Title: {user.role}</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditAccess(user)}
                      className="border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50"
                    >
                      Manage Access
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title={`Manage Access: ${selectedUser?.full_name}`}>
        {formMessage && (
          <div className={`p-3 rounded-lg flex items-center gap-2 mb-4 text-sm font-semibold ${formMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {formMessage.type === 'success' ? <CheckCircle className="size-4" /> : <ShieldAlert className="size-4" />}
            {formMessage.text}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Features</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {PERMISSIONS_DEF.map(perm => (
                <div 
                  key={perm.key}
                  onClick={() => setEditPerms((prev: any) => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    editPerms[perm.key] 
                      ? 'border-rose-500 bg-rose-50/30 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`font-bold text-sm ${editPerms[perm.key] ? 'text-rose-700' : 'text-slate-700'}`}>
                        {perm.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-tight">{perm.desc}</div>
                    </div>
                    <div className={`shrink-0 size-5 rounded-md flex items-center justify-center transition-colors ${
                      editPerms[perm.key] ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-300'
                    }`}>
                      <Check className="size-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Vertical Access</h4>
            <div className="flex flex-wrap gap-2">
              {verticals.map(v => {
                const isActive = (editPerms.allowed_verticals || []).includes(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => toggleVertical(v.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isActive && <Check className="size-3" />}
                    {v.name}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">Selected verticals will be visible to this user even if they aren't explicitly assigned to tasks within them.</p>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setSelectedUser(null)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={updatePermissionsMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
            >
              {updatePermissionsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
