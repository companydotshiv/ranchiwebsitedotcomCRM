import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowRight, Key, Sparkles, User } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userRole = 'user';
  let isClient = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile) userRole = profile.role || 'user';
    
    const { data: clientRecord } = await supabase.from('clients').select('id').eq('auth_user_id', user.id).maybeSingle();
    if (clientRecord) isClient = true;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-3 relative overflow-hidden text-slate-900"
          style={{
            background: "linear-gradient(-45deg, #4f46e5, #a855f7, #3b82f6, #9333ea)",
            backgroundSize: "400% 400%",
            animation: "gradientBG 15s ease infinite"
          }}>
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="max-w-md w-full text-center bg-white border border-slate-100 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col">


        {/* Top Banner Image */}
        <div className="w-full h-48 sm:h-56 relative shrink-0">
          <img 
            src="/profile-banner.jpg" 
            alt="Cinematickrs CRM Banner" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Container */}
        <div className="p-6 space-y-4 flex flex-col items-center">
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Welcome to Cinematickrs Official CRM
            </h1>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Your all in one platform for tracking clients, managing tasks, monitoring employees, handling leaves and attendance and much more.
            </p>
          </div>

          <div className="w-full pt-2">
          {user ? (
            <Link
              href={(userRole === 'client' || isClient) ? '/client-portal' : '/profile'}
              className="group flex items-center justify-center gap-2 w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-lg hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <User className="size-5" />
              {(userRole === 'client' || isClient) ? 'Go to Client Portal' : 'Go to Profile'}
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="flex items-center justify-center w-full h-11 bg-secondary text-secondary-foreground font-semibold rounded-lg border border-border/50 hover:bg-muted transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Sign Up
              </Link>
            </div>
          )}
          </div>
        </div>

      </div>
    </main>
  );
}
