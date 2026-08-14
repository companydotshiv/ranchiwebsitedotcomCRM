'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/motion';
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, X, Check,
  ChevronDown, ChevronRight, Award, Users2, AlertCircle,
  FolderOpen, UserPlus, GitBranch,
} from 'lucide-react';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────
interface Team { id: number; name: string; description: string; created_at: string }
interface Employee { id: string; name: string; email: string; workspace_role_ids: number[]; role: string; }
interface TeamMember { id: number; team_id: number; employee_id: string; parent_employee_id: string | null; employee: Employee }
interface TreeNode { member: TeamMember; children: TreeNode[] }

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function buildTree(members: TeamMember[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  members.forEach(m => map.set(m.employee_id, { member: m, children: [] }));
  const roots: TreeNode[] = [];
  members.forEach(m => {
    const node = map.get(m.employee_id)!;
    if (m.parent_employee_id !== null && map.has(m.parent_employee_id)) {
      map.get(m.parent_employee_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ─────────────────────────────────────────────────
// Tree node display (recursive)
// ─────────────────────────────────────────────────
function TreeNode({
  node, depth, teamId,
  onRemove, removingKey,
}: {
  node: TreeNode;
  depth: number;
  teamId: number;
  onRemove: (teamId: number, employeeId: string) => void;
  removingKey: string | null;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const nodeKey = `${teamId}-${node.member.employee_id}`;
  const isRemoving = removingKey === nodeKey;

  return (
    <div style={{ paddingLeft: depth > 0 ? 24 : 0 }}>
      {/* Connector line for non-root nodes */}
      <div className={`relative flex items-center gap-2 py-1.5 px-3 mb-1.5 rounded-xl border transition-all duration-100 group bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm`}>
        {/* Expand/collapse */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`shrink-0 size-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 transition-colors ${!hasChildren ? 'invisible' : ''}`}
        >
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        {/* Avatar */}
        <div className="shrink-0 size-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
          {initials(node.member.employee.name)}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 text-sm leading-tight truncate">{node.member.employee.name}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Award className="size-2.5 text-slate-700 shrink-0" />
            <span className="truncate">{node.member.employee.role || 'User'}</span>
          </div>
        </div>

        {/* Hierarchy level badge */}
        {depth > 0 && (
          <span className="shrink-0 text-[9px] text-slate-300 font-mono bg-slate-50 px-1.5 py-0.5 rounded">L{depth}</span>
        )}

        {/* Remove button */}
        {isRemoving ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-red-600 font-medium">Remove?</span>
            <button
              onClick={() => onRemove(teamId, node.member.employee_id)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 cursor-pointer"
            >
              <Check className="size-2.5" /> Yes
            </button>
          </div>
        ) : (
          <button
            onClick={() => onRemove(teamId, node.member.employee_id)}
            className="shrink-0 size-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
            title="Remove from team"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Children with vertical connector */}
      {hasChildren && open && (
        <div className="relative ml-6 pl-3 border-l-2 border-slate-100">
          {node.children.map(child => (
            <TreeNode
              key={child.member.id}
              node={child}
              depth={depth + 1}
              teamId={teamId}
              onRemove={onRemove}
              removingKey={removingKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Add Member inline form
// ─────────────────────────────────────────────────
function AddMemberForm({
  teamId,
  employees,
  currentMembers,
  onSave,
  onCancel,
  isSaving,
}: {
  teamId: number;
  employees: Employee[];
  currentMembers: TeamMember[];
  onSave: (teamId: number, empId: string, parentEmpId: string | null) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  const handleSave = () => {
    if (!selectedEmpId) return;
    onSave(
      teamId,
      selectedEmpId,
      selectedParentId || null
    );
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-slate-900" />
          <span className="text-sm font-bold text-slate-900">Add Member to Team</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Employee select */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              Select Employee
            </Label>
            <select
              value={selectedEmpId}
              onChange={e => setSelectedEmpId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-500"
            >
              <option value="">— Choose employee —</option>
              {employees.map(emp => {
                const alreadyIn = currentMembers.some(m => m.employee_id === emp.id);
                return (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{alreadyIn ? ' (already in team — updates position)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Parent (reports to) select */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              Reports to (hierarchy)
            </Label>
            <select
              value={selectedParentId}
              onChange={e => setSelectedParentId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-500"
            >
              <option value="">— Top level (no manager) —</option>
              {currentMembers
                .filter(m => !selectedEmpId || m.employee_id !== selectedEmpId)
                .map(m => (
                  <option key={m.employee_id} value={m.employee_id}>
                    {m.employee.name}
                  </option>
                ))}
            </select>
            <p className="text-[10px] text-slate-400">
              Leave blank to add as a top-level member with no manager in this team.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedEmpId || isSaving}
            className="h-9 px-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all cursor-pointer shadow-sm text-sm"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" />Adding...</span>
            ) : (
              <span className="flex items-center gap-1.5"><UserPlus className="size-3.5" />Add to Team</span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 px-3 border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </MotionDiv>
  );
}

// ─────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 animate-pulse space-y-2">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-3 bg-slate-50 rounded w-1/2" />
      <div className="h-12 bg-slate-50 rounded-xl" />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────
export default function TeamsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [authChecked, setAuthChecked] = useState(false);

  // Create team form
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit / delete team
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDesc, setEditTeamDesc] = useState('');
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);

  // Add member form state
  const [addingToTeamId, setAddingToTeamId] = useState<number | null>(null);

  // Remove member confirm
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  // Auth — session cache first, no network round-trip
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) router.push('/login');
          setAuthChecked(true);
        });
      } else {
        setAuthChecked(true);
      }
    });
  }, []);

  // ── Queries — all fire in parallel after auth ──
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('id');
      if (error) throw error;
      return data || [];
    },
    enabled: authChecked,
    staleTime: 15_000,
  });

  const { data: employees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ['employees_active'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: authChecked,
    staleTime: 15_000,
  });

  const { data: allMembers = [], isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ['team_members', employees],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('id');
      if (error) throw error;
      
      // Manually join with employees
      return (data || []).map(m => ({
        ...m,
        employee: employees.find(e => e.id === m.employee_id) || { id: m.employee_id, name: 'Unknown User', email: '', workspace_role_ids: [], role: 'user' }
      }));
    },
    enabled: authChecked && employees.length > 0,
    staleTime: 15_000,
  });

  // ── Mutations ──
  const createTeamMutation = useMutation({
    mutationFn: async (t: { name: string; description: string }) => {
      const { error } = await supabase.from('teams').insert([t]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setTeamName(''); setTeamDesc('');
      setFormMsg({ type: 'success', text: 'Team created successfully!' });
      setTimeout(() => setFormMsg(null), 3000);
    },
    onError: (e: any) => setFormMsg({ type: 'error', text: e.message }),
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description: string }) => {
      const { error } = await supabase.from('teams').update({ name, description }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); setEditingTeamId(null); },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      setDeletingTeamId(null);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ team_id, employee_id, parent_employee_id }: { team_id: number; employee_id: string; parent_employee_id: string | null }) => {
      const { error } = await supabase
        .from('team_members')
        .upsert([{ team_id, employee_id, parent_employee_id }], { onConflict: 'team_id,employee_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      setAddingToTeamId(null);
    },
    onError: (e: any) => setFormMsg({ type: 'error', text: e.message }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ team_id, employee_id }: { team_id: number; employee_id: string }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team_id)
        .eq('employee_id', employee_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      setRemovingKey(null);
    },
  });

  // ── Handlers ──
  const handleRemove = (teamId: number, employeeId: string) => {
    const key = `${teamId}-${employeeId}`;
    if (removingKey === key) {
      // Second click = confirmed
      removeMemberMutation.mutate({ team_id: teamId, employee_id: employeeId });
    } else {
      setRemovingKey(key);
      // Auto-cancel confirm after 4s
      setTimeout(() => setRemovingKey(prev => prev === key ? null : prev), 4000);
    }
  };

  const getMembersForTeam = (teamId: number) => allMembers.filter(m => m.team_id === teamId);

  if (!authChecked) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-3 bg-slate-50 min-h-screen">
        <Loader2 className="size-8 animate-spin text-slate-700" />
        <p className="text-sm text-slate-500 animate-pulse mt-3">Connecting...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Users2 className="size-7 text-indigo-600" />
            Team Organizer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create teams, add members, and define reporting hierarchies. One employee can belong to multiple teams.
          </p>
        </div>
        {(teamsLoading || empLoading || membersLoading) && (
          <Loader2 className="size-5 animate-spin text-indigo-600" />
        )}
      </div>

      <div className="space-y-4">

        {/* ── Create Team form ── */}
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 pt-5 px-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Plus className="size-4 text-slate-700" />
              Create New Team
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 px-3 pb-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (teamName.trim()) createTeamMutation.mutate({ name: teamName.trim(), description: teamDesc.trim() });
              }}
              className="flex flex-wrap gap-2 items-end"
            >
              <AnimatePresence mode="popLayout">
                {formMsg && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`w-full text-xs font-medium px-3 py-2 rounded-lg border flex items-center gap-1.5 ${formMsg.type === 'success' ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-red-50 border-red-200 text-red-600'}`}
                  >
                    {formMsg.type === 'success' ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
                    {formMsg.text}
                  </MotionDiv>
                )}
              </AnimatePresence>
              <div className="flex-1 min-w-[180px] space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Team Name</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Sales Squad, Creative Studio..."
                  required
                  className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-lg focus-visible:border-slate-500 focus-visible:ring-slate-900/20 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[180px] space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Description (optional)</Label>
                <Input
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="What does this team do?"
                  className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-lg focus-visible:border-slate-500 focus-visible:ring-slate-900/20 text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={createTeamMutation.isPending || !teamName.trim()}
                className="h-10 px-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 shadow-md shrink-0"
              >
                {createTeamMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4 mr-1" />Create Team</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Teams list ── */}
        {teamsLoading && (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!teamsLoading && teams.length === 0 && (
          <Card className="bg-white border-2 border-dashed border-slate-200">
            <CardContent className="py-16 text-center text-slate-400">
              <FolderOpen className="size-14 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold">No teams yet.</p>
              <p className="text-xs mt-1">Use the form above to create your first team.</p>
            </CardContent>
          </Card>
        )}

        {!teamsLoading && teams.map(team => {
          const members = getMembersForTeam(team.id);
          const tree = buildTree(members);
          const isAddingHere = addingToTeamId === team.id;

          return (
            <div key={team.id} className="relative group mb-4">
              <div className="absolute top-2 -right-1 -bottom-1 -left-1 bg-[linear-gradient(90deg,#3b82f6,#a855f7,#3b82f6)] bg-[length:200%_200%] rounded-xl opacity-0 group-hover:opacity-80 group-hover:animate-border-spin blur-[6px] transition-all duration-500 z-0"></div>
              <Card className="relative z-10 bg-white border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">

              {/* Team header */}
              <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 flex-wrap">
                {editingTeamId !== team.id ? (
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                      <Users2 className="size-5 text-slate-900 shrink-0" />
                      {team.name}
                      <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {team.description && (
                      <p className="text-xs text-slate-500 mt-0.5 pl-7 truncate">{team.description}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-wrap gap-2">
                    <Input value={editTeamName} onChange={e => setEditTeamName(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 h-9 rounded-lg text-sm flex-1 min-w-[140px]" />
                    <Input value={editTeamDesc} onChange={e => setEditTeamDesc(e.target.value)} placeholder="Description..."
                      className="bg-white border-slate-300 text-slate-900 h-9 rounded-lg text-sm flex-1 min-w-[140px]" />
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {editingTeamId === team.id ? (
                    <>
                      <button onClick={() => updateTeamMutation.mutate({ id: team.id, name: editTeamName, description: editTeamDesc })}
                        disabled={updateTeamMutation.isPending || !editTeamName.trim()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-600 hover:bg-slate-700 cursor-pointer">
                        <Check className="size-3" /> Save
                      </button>
                      <button onClick={() => setEditingTeamId(null)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer">
                        <X className="size-3" /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Add member */}
                      <button
                        onClick={() => setAddingToTeamId(isAddingHere ? null : team.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          isAddingHere
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <UserPlus className="size-3.5" />
                        {isAddingHere ? 'Close Form' : 'Add Member'}
                      </button>

                      {/* Edit team */}
                      <button onClick={() => { setEditingTeamId(team.id); setEditTeamName(team.name); setEditTeamDesc(team.description ?? ''); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 cursor-pointer">
                        <Pencil className="size-3" /> Edit
                      </button>

                      {/* Delete team */}
                      {deletingTeamId === team.id ? (
                        <>
                          <span className="text-xs text-red-600 font-medium">Delete team + all members?</span>
                          <button onClick={() => deleteTeamMutation.mutate(team.id)} disabled={deleteTeamMutation.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 cursor-pointer">
                            <Check className="size-3" /> Yes
                          </button>
                          <button onClick={() => setDeletingTeamId(null)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer">
                            <X className="size-3" /> No
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setDeletingTeamId(team.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer">
                          <Trash2 className="size-3" /> Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Add member inline form */}
              <AnimatePresence>
                {isAddingHere && (
                  <AddMemberForm
                    teamId={team.id}
                    employees={employees}
                    currentMembers={members}
                    onSave={(tid, empId, parentId) =>
                      addMemberMutation.mutate({ team_id: tid, employee_id: empId, parent_employee_id: parentId })
                    }
                    onCancel={() => setAddingToTeamId(null)}
                    isSaving={addMemberMutation.isPending}
                  />
                )}
              </AnimatePresence>

              {/* Team body: member tree */}
              <div className="p-3">
                {tree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                    <GitBranch className="size-8 mb-2 text-slate-200" />
                    <p className="text-sm font-medium">No members yet.</p>
                    <p className="text-xs mt-1">
                      Click{' '}
                      <button
                        onClick={() => setAddingToTeamId(team.id)}
                        className="text-slate-900 font-semibold underline cursor-pointer"
                      >
                        Add Member
                      </button>{' '}
                      above to get started.
                    </p>
                  </div>
                ) : (
                  <div>
                    {tree.map(node => (
                      <TreeNode
                        key={node.member.id}
                        node={node}
                        depth={0}
                        teamId={team.id}
                        onRemove={handleRemove}
                        removingKey={removingKey}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
            </div>
          );
        })}
      </div>
    </main>
  );
}
