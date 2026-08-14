'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Loader2, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; email: string; client_id: number | null } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Check if they are actually a client
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

      // Fetch the client_id this user belongs to
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (profileData?.role !== 'client' && !clientData) {
        // If they are not a client in role nor in the clients table, send them back
        router.push('/profile');
        return;
      }

      setProfile({
        full_name: profileData?.full_name || 'Client',
        email: session.user.email || '',
        client_id: clientData?.id || null
      });
      
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg">
              {profile?.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight">Client Portal</h1>
              <p className="text-xs text-slate-500 font-medium">Welcome back, {profile?.full_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="size-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Pass client_id to children if needed, or children can fetch it from auth.uid() using RLS */}
        {children}
      </main>
    </div>
  );
}
