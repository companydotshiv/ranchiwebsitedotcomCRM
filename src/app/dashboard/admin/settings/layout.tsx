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
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Mobile Horizontal Nav */}
      <div className="md:hidden w-full bg-white border-b border-slate-200 shrink-0 sticky top-0 z-20">
        <nav className="flex overflow-x-auto hide-scrollbar px-2 py-2 gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/dashboard/admin/settings' && pathname.startsWith(link.href + '/'));
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`size-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Left Vertical Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 z-10 shrink-0">
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Workspace Settings</div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/dashboard/admin/settings' && pathname.startsWith(link.href + '/'));
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50 relative z-0">
        
        {children}
      </main>
    </div>
  );
}
