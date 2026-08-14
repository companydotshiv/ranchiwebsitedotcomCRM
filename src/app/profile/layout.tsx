'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { MotionDiv } from '@/components/ui/motion';
import { Loader2, LogOut, User, Settings, Users, Shield, GitBranch, Layers, Menu, X, UserPlus, ListTodo, ChevronDown, Calendar, CalendarOff, UserCog } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AttendanceHeaderButton } from '@/components/attendance/AttendanceHeaderButton';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string; email: string; isAdmin: boolean; isDirector: boolean; roles: string[] } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role, user_roles(role:roles(name))')
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
      const isAdmin = roles.some((r: string) => ['Director', 'Associate Operational Manager', 'Senior Strategist'].includes(r));
      const isDirector = roles.includes('Director');

      setProfile({
        full_name: profileData?.full_name || '',
        avatar_url: profileData?.avatar_url || '',
        email: session.user.email || '',
        isAdmin,
        isDirector,
        roles
      });
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const { data: verticals = [] } = useQuery({
    queryKey: ['verticals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('verticals').select('id, name').order('name');
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!profile,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { name: 'User Access Control', href: '/dashboard/admin/settings/access', icon: Shield },
    { name: 'Account Center', href: '/dashboard/admin/settings', icon: Settings },
    { name: 'Manage Verticals', href: '/dashboard/admin/settings/verticals', icon: Layers },
    { name: 'Employee Directory', href: '/dashboard/admin/settings/employees', icon: Users },
    { name: 'Team Organizer', href: '/dashboard/admin/settings/teams', icon: GitBranch },
    { name: 'Default Mini Tasks', href: '/dashboard/admin/settings/mini-tasks', icon: ListTodo },
  ].filter(link => {
    const directorOnly = ['User Access Control', 'Account Center', 'Manage Verticals', 'Employee Directory', 'Team Organizer', 'Default Mini Tasks'];
    if (directorOnly.includes(link.name) && !profile?.isDirector) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header 
        className="h-16 border-b border-transparent sticky top-0 z-50 flex items-center justify-between px-3 md:px-3 shadow-md relative"
        style={{ background: 'linear-gradient(to right, #01C3CC, #7D2AE8)' }}
      >
        <div className="flex items-center gap-2 shrink-0 z-10">
          <button
            className="md:hidden p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
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
            {verticals.map((v: any) => (
              <Link
                key={v.id}
                href={`/dashboard/${v.name.toLowerCase()}`}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:shadow-sm rounded-md transition-all"
              >
                {v.name}
              </Link>
            ))}
            </nav>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 z-10">
          <AttendanceHeaderButton />
          
          <div className="mr-2 hidden sm:block">
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
                 {(profile?.isAdmin || profile?.roles?.includes('HR')) && (
                   <>
                     <div className="border-t border-slate-100 my-1"></div>
                     <Link href="/dashboard/hr/attendance" className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors">
                       <Users className="size-4" /> HR Attendance
                     </Link>
                     <Link href="/dashboard/hr/leaves" className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors">
                       <UserCog className="size-4" /> HR Leaves
                     </Link>
                   </>
                 )}
                 <div className="border-t border-slate-100 my-1"></div>
                 <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                   <Settings className="size-4" /> Settings
                 </Link>
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
        {/* Left Vertical Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 z-10 shrink-0">
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Workspace Settings</div>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100 shadow-inner">
              <img src="/logo.jpg" alt="Logo" className="size-10 rounded-xl mx-auto mb-2 opacity-50 grayscale" />
              <p className="text-[10px] font-bold text-slate-400">Cinematickrs CRM v1.0</p>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-[60] flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <MotionDiv
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-3 border-b border-slate-100">
                <span className="font-extrabold text-sm tracking-tight text-slate-900">Menu</span>
                <button onClick={() => setSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-lg">
                  <X className="size-4" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                {/* Mobile Verticals Nav */}
                {verticals.length > 0 && (
                  <div className="lg:hidden mb-6 flex flex-col space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Workspaces</div>
                    {verticals.map((v: any) => (
                      <Link
                        key={v.id}
                        href={`/dashboard/${v.name.toLowerCase()}`}
                        className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        {v.name}
                      </Link>
                    ))}
                  </div>
                )}
                
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Workspace Settings</div>
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-bold shadow-sm ring-1 ring-slate-900/20'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`size-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-slate-100">
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 bg-white"
                >
                  <LogOut className="size-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </MotionDiv>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto w-full bg-slate-50 relative">
          {children}
        </div>
      </div>
    </div>
  );
}
