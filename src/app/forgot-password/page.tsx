'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionDiv, fadeInUp, staggerContainer, scaleHover } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';
import { HelpCircle, Mail, Loader2, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('A password reset link has been sent to your email.');
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

      {/* Back button */}
      <Link href="/login" className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/80 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80 backdrop-blur-md shadow-sm">
        <ArrowLeft className="size-4" />
        Back to login
      </Link>

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
                <HelpCircle className="size-6 text-slate-900" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Forgot Password
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Enter your email address and we'll send you a password reset link
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleResetRequest} className="space-y-2">
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

                <MotionDiv variants={scaleHover} className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-lg disabled:pointer-events-none disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <Loader2 className="size-4 animate-spin" />
                        Sending request...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        Send Reset Link
                        <Send className="size-3.5" />
                      </span>
                    )}
                  </Button>
                </MotionDiv>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2 text-center text-xs text-slate-500 border-t border-slate-100 py-3">
              <div>
                Back to{' '}
                <Link href="/login" className="text-slate-900 hover:text-slate-900 transition-colors font-semibold">
                  Login
                </Link>
              </div>
            </CardFooter>
          </Card>
        </MotionDiv>
      </MotionDiv>
    </main>
  );
}
