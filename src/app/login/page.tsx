'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MotionDiv, fadeInUp, staggerContainer, scaleHover } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';
import { Key, Mail, Lock, Loader2, ArrowLeft, Activity, Users, Shield, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        // Fetch user profile to check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // Also check if they exist in the clients table to ensure they get redirected correctly
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('id')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();

        setSuccessMsg('Successfully logged in! Redirecting...');
        setTimeout(() => {
          if (profile?.role === 'client' || clientRecord) {
            router.push('/client-portal');
          } else {
            router.push('/profile');
          }
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* Left Column: Visual Panel (Dark Theme for high-contrast visual balance) */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-3 overflow-hidden border-r border-slate-200/10 bg-slate-950 text-white">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,oklch(0.65_0.20_150/_8%)_0px,transparent_50%),radial-gradient(at_100%_100%,oklch(0.55_0.22_150/_6%)_0px,transparent_50%)]" />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-slate-900/5 rounded-full blur-3xl -z-10 animate-pulse" />

        {/* Top brand info */}
        <div className="relative z-10 flex items-center gap-2">
          <img 
            src="/logo.jpg" 
            alt="Cinematickrs CRM Logo" 
            className="size-10 rounded-xl object-cover border border-white/10"
          />
          <span className="font-bold tracking-wider text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
            Cinematickrs CRM
          </span>
        </div>

        {/* Main interactive visual card */}
        <div className="relative z-10 my-auto max-w-sm space-y-2">
          <div className="glass-dark border-white/10 rounded-xl p-3 shadow-2xl space-y-2 animate-float">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="size-3.5" />
                Live Status
              </span>
              <span className="size-2 bg-emerald-400 rounded-full animate-ping" />
            </div>
            
            <div className="space-y-2">
              <div className="h-2 bg-white/10 rounded-full w-2/3" />
              <div className="h-2 bg-white/5 rounded-full w-1/2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
              <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Active Users</span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  <Users className="size-4 text-slate-500" />
                  1,402
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Security</span>
                <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                  <Shield className="size-4" />
                  RLS Active
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
              High-Performance Auth Portal
            </h2>
            <p className="text-sm text-white/60">
              Experience lightning fast user logins secured by Row-Level Security, real-time database queries, and custom metadata mapping.
            </p>
          </div>
        </div>

        {/* Bottom stats / info */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/40">
          <span>Version 1.0.0</span>
          <span>•</span>
          <span>Powered by Supabase</span>
        </div>
      </div>

      {/* Right Column: Form Panel (Light Theme) */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-3 z-10 relative bg-slate-50">
        {/* Back button */}
        <Link 
          href="/" 
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/80 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80 backdrop-blur-md shadow-sm"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>

        {/* Glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-900/5 rounded-full blur-3xl -z-10" />

        <MotionDiv
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="max-w-md w-full space-y-2"
        >
          <MotionDiv variants={fadeInUp} className="space-y-2 text-center md:text-left">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Sign In
            </h1>
            <p className="text-sm text-slate-500">
              Enter your credentials to manage your Cinematickrs CRM profile.
            </p>
          </MotionDiv>

          <MotionDiv variants={fadeInUp} className="bg-white border border-slate-100 p-3 rounded-xl shadow-xl relative">
            {/* Top gradient bar */}
            <div className="absolute -top-[1px] left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <form onSubmit={handleLogin} className="space-y-2">
              <AnimatePresence mode="popLayout">
                {errorMsg && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-start gap-2"
                  >
                    <Shield className="size-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </MotionDiv>
                )}
                {successMsg && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-xs font-semibold flex items-start gap-2"
                  >
                    <Sparkles className="size-4 shrink-0 mt-0.5 animate-pulse" />
                    <span>{successMsg}</span>
                  </MotionDiv>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-slate-900 hover:text-slate-900 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <MotionDiv variants={scaleHover} className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-lg hover:shadow-primary/15 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5 justify-center">
                      <Loader2 className="size-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </MotionDiv>
            </form>

          </MotionDiv>
        </MotionDiv>
      </div>
    </main>
  );
}
