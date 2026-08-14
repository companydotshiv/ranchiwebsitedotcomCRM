'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionDiv, fadeInUp, staggerContainer, scaleHover } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordReset = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Your password has been successfully updated! Redirecting to profile...');
        setTimeout(() => {
          router.push('/profile');
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-3 relative overflow-hidden bg-slate-50 text-slate-900 min-h-screen">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-900/5 rounded-full blur-3xl -z-10" />

      <MotionDiv
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-md w-full"
      >
        <MotionDiv variants={fadeInUp}>
          <Card className="bg-white border border-slate-100 shadow-xl relative overflow-visible">
            {/* Design accents */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
            
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto inline-flex items-center justify-center size-12 rounded-xl bg-slate-900/10 border border-slate-500/20 mb-1">
                <ShieldAlert className="size-6 text-slate-900" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Update Password
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Enter your new password below to secure your account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {errorMsg && (
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium"
                    >
                      {errorMsg}
                    </MotionDiv>
                  )}
                  {successMsg && (
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-xs font-medium"
                    >
                      {successMsg}
                    </MotionDiv>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    New Password
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
                      className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    Confirm New Password
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
                      className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl focus-visible:border-slate-500 focus-visible:ring-slate-900/20 transition-all text-sm shadow-sm"
                      disabled={loading}
                    />
                  </div>
                </div>

                <MotionDiv variants={scaleHover} className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-lg disabled:pointer-events-none disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <Loader2 className="size-4 animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </MotionDiv>
              </form>
            </CardContent>
          </Card>
        </MotionDiv>
      </MotionDiv>
    </main>
  );
}
