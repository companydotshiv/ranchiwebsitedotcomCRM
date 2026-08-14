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
import { Key, Mail, Lock, User, Phone, Loader2, ArrowLeft, Shield, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        const identities = data.user.identities || [];
        if (identities.length === 0) {
          setSuccessMsg('Registration successful! Please check your email for a confirmation link.');
        } else {
          setSuccessMsg('Registration successful! Redirecting to your profile...');
          setTimeout(() => {
            router.push('/profile');
            router.refresh();
          }, 1500);
        }
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
                <Sparkles className="size-3.5" />
                Join the Network
              </span>
              <span className="text-xs text-white/50">Free Registration</span>
            </div>
            
            <p className="text-xs text-white/60 leading-relaxed">
              Create your profile instantly. Cinematickrs CRM's custom database listener automatically maps your signups to profile structures with instant storage allocation.
            </p>

            <div className="pt-2 border-t border-white/5 flex gap-2 items-center text-xs text-white/70">
              <div className="size-2 rounded-full bg-emerald-400" />
              Realtime Sync Enabled
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
              Secure Account Creation
            </h2>
            <p className="text-sm text-white/60">
              Register inside the Cinematickrs CRM portal. Manage your avatar photos, profile details, and account credentials through a central dashboard.
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
      <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-3 z-10 relative bg-slate-50 overflow-y-auto">
        {/* Back button */}
        <Link 
          href="/" 
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/80 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80 backdrop-blur-md shadow-sm"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-900/5 rounded-full blur-3xl -z-10" />

        <MotionDiv
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="max-w-md w-full space-y-2 my-3"
        >
          <MotionDiv variants={fadeInUp} className="space-y-2 text-center md:text-left">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Create Account
            </h1>
            <p className="text-sm text-slate-500">
              Sign up below to setup your secure Cinematickrs CRM profile.
            </p>
          </MotionDiv>

          <MotionDiv variants={fadeInUp} className="bg-white border border-slate-100 p-3 rounded-xl shadow-xl relative">
            <div className="absolute -top-[1px] left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <form onSubmit={handleRegister} className="space-y-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="fullName"
                      type="text"
                      required
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      required
                      placeholder="1234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

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
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    Confirm Pass
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-10 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                      disabled={loading}
                    />
                  </div>
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
                      Creating account...
                    </span>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </MotionDiv>
            </form>

            <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-5 mt-3">
              Already have an account?{' '}
              <Link href="/login" className="text-slate-900 hover:text-slate-900 transition-colors font-semibold">
                Log in here
              </Link>
            </div>
          </MotionDiv>
        </MotionDiv>
      </div>
    </main>
  );
}
