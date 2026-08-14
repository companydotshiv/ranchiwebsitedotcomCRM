'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, User, LayoutDashboard, Building2, UserPlus, Settings, Bell, Calendar, CalendarOff, Users, UserCog, ChevronDown, Menu, X } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AttendanceHeaderButton } from '@/components/attendance/AttendanceHeaderButton';
import { BirthdayBanner } from '@/components/BirthdayBanner';

const PROTECTED_VERTICALS = ['Finance', 'Sales', 'HR'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string; email: string; isAdmin: boolean; isHR: boolean; isDirector: boolean; roles: string[]; allowedVerticalIds: number[] } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role, user_roles(role:roles(name, permissions))')
        .eq('id', session.user.id)
        .single();

      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (profileData?.role === 'client' || clientRecord) {
        router.push('/client-portal');
        return;
      }

      const roles = profileData?.user_roles?.map((ur: any) => ur.role?.name) || [];
      let isAdmin = roles.some((r: string) => ['Director', 'Associate Operational Manager', 'Senior Strategist'].includes(r));
      let isHR = roles.includes('HR');
      let isDirector = roles.includes('Director');
      
      const allowedVerticalIds: number[] = [];
      profileData?.user_roles?.forEach((ur: any) => {
        if (ur.role?.permissions) {
          if (ur.role.permissions.manage_settings) isAdmin = true;
          if (ur.role.permissions.manage_users) isHR = true;
          if (ur.role.permissions.allowed_verticals) {
             allowedVerticalIds.push(...ur.role.permissions.allowed_verticals);
          }
        }
      });

      setProfile({
        full_name: profileData?.full_name || '',
        avatar_url: profileData?.avatar_url || '',
        email: session.user.email || '',
        isAdmin,
        isHR,
        isDirector,
        roles,
        allowedVerticalIds
      });
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const { data: accessGraph } = useQuery({
    queryKey: ['user_access', profile?.isAdmin],
    queryFn: async () => {
      if (profile?.isAdmin) return { allowedClients: new Set() };
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { allowedClients: new Set() };

      const userId = session.user.id;
      const [tasksRes, subtasksRes] = await Promise.all([
        supabase.from('tasks').select('client_id').eq('assigned_to', userId),
        supabase.from('task_subtasks').select('task_id').eq('assigned_to', userId)
      ]);

      const subtaskTaskIds = subtasksRes.data?.map(s => s.task_id) || [];
      const parentTasksRes = subtaskTaskIds.length > 0 
        ? await supabase.from('tasks').select('client_id').in('id', subtaskTaskIds)
        : { data: [] };

      const allTasks = [...(tasksRes.data || []), ...(parentTasksRes.data || [])];
      
      return {
        allowedClients: new Set(allTasks.map(t => t.client_id).filter(id => id !== null))
      };
    },
    enabled: !!profile && !profile.isAdmin
  });

  const { data: verticals = [], isLoading: isLoadingVerticals } = useQuery({
    queryKey: ['verticals', accessGraph, profile?.allowedVerticalIds],
    queryFn: async () => {
      const { data, error } = await supabase.from('verticals').select('id, name').order('name');
      if (error && error.code !== '42P01') throw error;
      
      if (profile?.isAdmin) return data || [];
      if (!accessGraph) return [];
      
      const allVerts = data || [];
      
      // Filter verticals based purely on allowed clients
      if (accessGraph.allowedClients.size > 0 || (profile?.allowedVerticalIds && profile.allowedVerticalIds.length > 0)) {
        let cvData: any[] = [];
        if (accessGraph.allowedClients.size > 0) {
          const { data: cv } = await supabase.from('client_verticals').select('vertical_id').in('client_id', Array.from(accessGraph.allowedClients));
          cvData = cv || [];
        }
        
        const allowedVerts = new Set(cvData.map((c: any) => c.vertical_id));
        
        return allVerts.filter(v => {
          if (profile?.allowedVerticalIds.includes(v.id)) return true;
          if (allowedVerts.has(v.id)) return true;
          return false;
        });
      }

      return [];
    },
    enabled: !!profile && (profile.isAdmin || !!accessGraph),
  });

  // Extract vertical name from pathname (e.g. /dashboard/sales -> sales)
  const pathParts = pathname.split('/');
  const currentPathCategory = pathParts[2] || '';
  const isGlobalRoute = ['attendance', 'leaves', 'hr', 'profile', 'admin', 'tickets'].includes(currentPathCategory.toLowerCase());
  const activeVerticalName = isGlobalRoute ? '' : currentPathCategory;

  // Protect Vertical Routes
  useEffect(() => {
    if (loading || !profile || isLoadingVerticals) return;
    
    if (activeVerticalName) {
      if (profile.isAdmin) return;
      
      const hasAccess = verticals.some((v: any) => v.name.toLowerCase() === activeVerticalName.toLowerCase());
      if (!hasAccess) {
        if (verticals.length > 0) {
          router.replace(`/dashboard/${verticals[0].name.toLowerCase()}`);
        } else {
          router.replace('/profile');
        }
      }
    }
  }, [activeVerticalName, verticals, loading, profile, isLoadingVerticals, router]);

  // Fetch clients for this vertical
  const { data: verticalClients = [] } = useQuery({
    queryKey: ['verticalClients', activeVerticalName],
    queryFn: async () => {
      if (!activeVerticalName) return [];
      
      const { data: vertical } = await supabase.from('verticals').select('id').ilike('name', activeVerticalName).single();
      if (!vertical) return [];

      if (activeVerticalName.toLowerCase() === 'sales') {
        const query = supabase.from('clients').select('*').order('created_at', { ascending: false });
        const { data: clients, error } = await query;
        if (error && error.code !== '42P01') throw error;
        return clients || [];
      }

      const { data: clientVerts } = await supabase.from('client_verticals').select('client_id').eq('vertical_id', vertical.id);
      if (!clientVerts || clientVerts.length === 0) return [];

      const clientIds = clientVerts.map(cv => cv.client_id);

      const { data: clients, error } = await supabase.from('clients').select('*').in('id', clientIds).order('created_at', { ascending: false });
      
      if (error && error.code !== '42P01') throw error;
      return clients || [];
    },
    enabled: !!activeVerticalName,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <BirthdayBanner />
      {/* Top Header */}
      <header 
        className="h-16 border-b border-transparent sticky top-0 z-50 flex items-center justify-between px-3 md:px-3 shadow-md relative"
        style={{ background: 'linear-gradient(to right, #01C3CC, #7D2AE8)' }}
      >
        <div className="flex items-center gap-2 shrink-0 z-10">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="size-6" />
          </button>
          <Link href="/profile" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src="/logo.jpg" alt="Cinematickrs CRM Logo" className="size-8 rounded-lg object-cover border border-white/20 shadow-sm" />
            <span className="font-extrabold text-sm tracking-tight hidden sm:block text-white drop-shadow-sm">Cinematickrs CRM</span>
          </Link>
        </div>

        {/* Centered Verticals Nav */}
        {verticals.length > 0 && (
          <div className="hidden lg:flex flex-1 items-center justify-center min-w-0 px-4 z-0">
            <nav className="flex items-center gap-1 bg-slate-50/50 p-1 rounded-lg border border-slate-100 shadow-sm backdrop-blur-sm overflow-x-auto hide-scrollbar max-w-full">
            {[...verticals].sort((a, b) => {
              const aName = a.name.trim().toLowerCase();
              const bName = b.name.trim().toLowerCase();
              const aIdx = PROTECTED_VERTICALS.findIndex(v => v.toLowerCase() === aName);
              const bIdx = PROTECTED_VERTICALS.findIndex(v => v.toLowerCase() === bName);
              if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
              if (aIdx !== -1) return -1;
              if (bIdx !== -1) return 1;
              return a.name.localeCompare(b.name);
            }).map((v: any) => {
              const isProtected = PROTECTED_VERTICALS.some(p => p.toLowerCase() === v.name.trim().toLowerCase());
              const isActive = pathname.includes(`/dashboard/${v.name.toLowerCase()}`);
              return (
                <Link
                  key={v.id}
                  href={`/dashboard/${v.name.toLowerCase()}`}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {v.name}
                </Link>
              );
            })}
            </nav>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 z-10">
          <Link href="/dashboard/tickets">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 h-9 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-semibold shadow-sm transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-indigo-500"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
              Tickets
            </Button>
          </Link>
          <AttendanceHeaderButton />
          
          <div className="mr-2">
            <NotificationBell />
          </div>

          {/* Profile Section with Dropdown */}
          <div 
            className="relative group"
            onMouseEnter={() => setIsProfileOpen(true)}
            onMouseLeave={() => setIsProfileOpen(false)}
          >
            <div 
              className="flex items-center gap-2 cursor-pointer py-2 pr-2"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-white flex items-center gap-1 drop-shadow-sm">
                  {profile?.full_name || 'Guest User'}
                  <ChevronDown className="size-3 text-white/70 group-hover:text-white transition-colors" />
                </span>
              </div>
              <div className="size-9 rounded-full overflow-hidden border-2 border-white/40 bg-slate-100 shadow-sm shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-900">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Mobile overlay to close */}
            {isProfileOpen && (
              <div 
                className="fixed inset-0 z-40 md:hidden" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(false);
                }}
              />
            )}

            {/* Dropdown Menu on Hover/Click */}
            <div className={`absolute right-0 top-[calc(100%-8px)] mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 transition-all duration-200 origin-top-right z-50 overflow-hidden ${
              isProfileOpen ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
            }`}>
               <div className="py-2">
                 <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team & HR</div>
                 <Link href="/dashboard/attendance" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                   <Calendar className="size-4" /> Attendance
                 </Link>
                 <Link href="/dashboard/leaves" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                   <CalendarOff className="size-4" /> Leaves
                 </Link>

                 <div className="border-t border-slate-100 my-1"></div>
                 {profile?.isDirector && (
                   <Link href="/dashboard/admin/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                     <Settings className="size-4" /> Settings
                   </Link>
                 )}
                 <button 
                   onClick={() => {
                     setIsProfileOpen(false);
                     handleSignOut();
                   }} 
                   className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                 >
                   <LogOut className="size-4" /> Sign Out
                 </button>
               </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left Vertical Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 md:z-0 w-72 md:w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col
          transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          ${pathname.includes('/dashboard/admin/settings') ? 'md:hidden' : ''}
        `}>
          <div className="h-16 flex items-center px-4 border-b border-slate-100 md:hidden bg-[linear-gradient(to_right,#01C3CC,#7D2AE8)] shrink-0">
             <span className="font-extrabold text-white text-lg">Cinematickrs CRM</span>
             <button onClick={() => setIsMobileMenuOpen(false)} className="ml-auto text-white/80 hover:text-white p-2">
               <X className="size-6" />
             </button>
          </div>
          <nav className="flex-1 px-3 py-4 md:py-3 space-y-1 overflow-y-auto">
            
            {/* Mobile Verticals Nav (hidden on lg where it's in header) */}
            {verticals.length > 0 && (
              <div className="lg:hidden mb-6 flex flex-col space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Workspaces</div>
                {[...verticals].sort((a, b) => {
                  const aName = a.name.trim().toLowerCase();
                  const bName = b.name.trim().toLowerCase();
                  const aIdx = PROTECTED_VERTICALS.findIndex(v => v.toLowerCase() === aName);
                  const bIdx = PROTECTED_VERTICALS.findIndex(v => v.toLowerCase() === bName);
                  if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                  if (aIdx !== -1) return -1;
                  if (bIdx !== -1) return 1;
                  return a.name.localeCompare(b.name);
                }).map((v: any) => {
                  const isActive = pathname.includes(`/dashboard/${v.name.toLowerCase()}`);
                  return (
                    <Link
                      key={v.id}
                      href={`/dashboard/${v.name.toLowerCase()}`}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className={`size-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                      {v.name}
                    </Link>
                  );
                })}
              </div>
            )}
            {activeVerticalName && (
              <div className="mb-6 flex flex-col space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Navigation</div>
              
              <Link
                href={`/dashboard/${activeVerticalName}`}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                  pathname === `/dashboard/${activeVerticalName}`
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                    : 'text-slate-600'
                }`}
              >
                <LayoutDashboard className={`size-4 transition-colors group-hover/link:text-white ${pathname === `/dashboard/${activeVerticalName}` ? 'text-slate-900' : 'text-slate-400'}`} />
                Overview
              </Link>

              {(profile?.roles?.includes('Associate Operational Manager') || activeVerticalName?.toLowerCase() === 'sales') && (
                <Link
                  href={`/dashboard/${activeVerticalName}/onboarding`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                    pathname.includes(`/dashboard/${activeVerticalName}/onboarding`)
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-slate-600'
                  }`}
                >
                  <Building2 className={`size-4 transition-colors group-hover/link:text-white ${pathname.includes(`/dashboard/${activeVerticalName}/onboarding`) ? 'text-primary-foreground' : 'text-slate-400'}`} />
                  Onboarding Form
                </Link>
              )}

              <Link
                href={`/dashboard/${activeVerticalName}/my-tasks`}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                  pathname === `/dashboard/${activeVerticalName}/my-tasks`
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                    : 'text-slate-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`size-4 transition-colors group-hover/link:text-white ${pathname === `/dashboard/${activeVerticalName}/my-tasks` ? 'text-slate-900' : 'text-slate-400'}`}><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M21 12h-6"/></svg>
                My Tasks
              </Link>

              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1 px-2">Clients</div>
              
              {verticalClients.length === 0 ? (
                <div className="px-2 text-xs text-slate-500 italic">No clients assigned yet.</div>
              ) : (
                verticalClients.map((client: any) => {
                  const clientUrl = `/dashboard/${activeVerticalName}/client/${client.id}`;
                  const isClientActive = pathname.includes(clientUrl);
                  
                  return (
                    <Link
                      key={client.id}
                      href={clientUrl}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                        isClientActive
                          ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                          : 'text-slate-600'
                      }`}
                    >
                      <Building2 className={`size-4 transition-colors group-hover/link:text-white ${isClientActive ? 'text-slate-900' : 'text-slate-400'}`} />
                      <span className="truncate">{client.business_name}</span>
                    </Link>
                  );
                })
              )}
              </div>
            )}
            
            {isGlobalRoute && (
              <div className="mb-6 flex flex-col space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Team & HR</div>
                
                <Link
                  href="/dashboard/attendance"
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                    pathname === '/dashboard/attendance'
                      ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                      : 'text-slate-600'
                  }`}
                >
                  <Calendar className={`size-4 transition-colors group-hover/link:text-white ${pathname === '/dashboard/attendance' ? 'text-slate-900' : 'text-slate-400'}`} />
                  Mark Attendance
                </Link>

                <Link
                  href="/dashboard/attendance/history"
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                    pathname.includes('/dashboard/attendance/history')
                      ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                      : 'text-slate-600'
                  }`}
                >
                  <Calendar className={`size-4 transition-colors group-hover/link:text-white ${pathname.includes('/dashboard/attendance/history') ? 'text-slate-900' : 'text-slate-400'}`} />
                  Attendance History
                </Link>

                <Link
                  href="/dashboard/leaves"
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                    pathname === '/dashboard/leaves'
                      ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                      : 'text-slate-600'
                  }`}
                >
                  <CalendarOff className={`size-4 transition-colors group-hover/link:text-white ${pathname === '/dashboard/leaves' ? 'text-slate-900' : 'text-slate-400'}`} />
                  Leave
                </Link>

                <Link
                  href="/dashboard/leaves/apply"
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                    pathname === '/dashboard/leaves/apply'
                      ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/10'
                      : 'text-slate-600'
                  }`}
                >
                  <CalendarOff className={`size-4 transition-colors group-hover/link:text-white ${pathname === '/dashboard/leaves/apply' ? 'text-slate-900' : 'text-slate-400'}`} />
                  Apply for Leave
                </Link>

                {(profile?.isAdmin || profile?.isHR) && (
                  <>
                    <Link
                      href="/dashboard/hr/attendance"
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                        pathname.includes('/dashboard/hr/attendance')
                          ? 'bg-purple-100 text-purple-900 font-bold shadow-sm ring-1 ring-purple-900/10'
                          : 'text-slate-600'
                      }`}
                    >
                      <Users className={`size-4 transition-colors group-hover/link:text-white ${pathname.includes('/dashboard/hr/attendance') ? 'text-purple-900' : 'text-slate-400'}`} />
                      Daily Attendance Log
                    </Link>
                    <Link
                      href="/dashboard/hr/leaves"
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                        pathname.includes('/dashboard/hr/leaves')
                          ? 'bg-purple-100 text-purple-900 font-bold shadow-sm ring-1 ring-purple-900/10'
                          : 'text-slate-600'
                      }`}
                    >
                      <UserCog className={`size-4 transition-colors group-hover/link:text-white ${pathname.includes('/dashboard/hr/leaves') ? 'text-purple-900' : 'text-slate-400'}`} />
                      HR Leave Management
                    </Link>
                    {profile?.isDirector && (
                      <Link
                        href="/dashboard/admin/settings/employees"
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                          pathname.includes('/dashboard/admin/settings/employees')
                            ? 'bg-purple-100 text-purple-900 font-bold shadow-sm ring-1 ring-purple-900/10'
                            : 'text-slate-600'
                        }`}
                      >
                        <UserPlus className={`size-4 transition-colors group-hover/link:text-white ${pathname.includes('/dashboard/admin/settings/employees') ? 'text-purple-900' : 'text-slate-400'}`} />
                        Employee Directory
                      </Link>
                    )}
                  </>
                )}
                
                {profile?.isDirector && (
                  <>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1 px-2">Admin</div>
                    <Link
                      href="/dashboard/admin/settings/access"
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin hover:text-white group/link ${
                        pathname.includes('/dashboard/admin/settings/access')
                          ? 'bg-rose-100 text-rose-900 font-bold shadow-sm ring-1 ring-rose-900/10'
                          : 'text-slate-600'
                      }`}
                    >
                      <Settings className={`size-4 transition-colors group-hover/link:text-white ${pathname.includes('/dashboard/admin/access') ? 'text-rose-900' : 'text-slate-400'}`} />
                      User Access Control
                    </Link>
                  </>
                )}
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full bg-slate-50 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
