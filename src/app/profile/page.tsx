'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MotionDiv, fadeInUp, staggerContainer } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';
import { 
  User, Phone, Mail, Camera, Loader2, LogOut, CheckCircle, ShieldAlert, 
  Lock, Shield, Calendar, CalendarDays, Settings
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  role: string;
  dob?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status states
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Fetch current authenticated user session
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email ?? null);
      } else {
        router.push('/login');
      }
    };
    getUser();
  }, [router]);

  // Fetch profile via TanStack Query
  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error.message);
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });

  // Sync form states with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setDob(profile.dob ?? '');
    }
  }, [profile]);

  // Mutation to update profile details
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: { full_name: string; phone: string; dob: string | null }) => {
      if (!userId) throw new Error('User not logged in');
      
      // Send null if dob is empty so it clears the date in db instead of passing empty string
      const dataToUpdate = {
        ...updatedData,
        dob: updatedData.dob === '' ? null : updatedData.dob
      };

      const { error } = await supabase
        .from('profiles')
        .update(dataToUpdate)
        .eq('id', userId);
      
      if (error) throw error;
      return dataToUpdate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      setProfileMessage({ type: 'success', text: 'Profile details updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    },
    onError: (error: any) => {
      setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile details.' });
    }
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    updateProfileMutation.mutate({ full_name: fullName, phone, dob });
  };

  // Mutation to update password
  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 3000);
    },
    onError: (error: any) => {
      setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password.' });
    }
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    updatePasswordMutation.mutate(newPassword);
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Image file size must be less than 2MB' });
      return;
    }

    setAvatarLoading(true);
    setProfileMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      setProfileMessage({ type: 'success', text: 'Profile photo updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Error uploading profile photo' });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    router.push('/login');
    router.refresh();
  };

  if (profileLoading || !userId) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-3 bg-slate-50 text-slate-900 min-h-screen">
        <Loader2 className="size-8 animate-spin text-slate-700" />
      </main>
    );
  }

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1200px]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="size-7 text-indigo-600" />
            Account Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal information and security preferences.</p>
        </div>
        <Button onClick={handleSignOut} variant="outline" className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 shadow-sm">
          <LogOut className="size-4" /> Sign Out
        </Button>
      </div>

      <MotionDiv variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Avatar & Basic Info */}
        <MotionDiv variants={fadeInUp} className="lg:col-span-4 space-y-6">
          <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
            <div 
              className="h-32 bg-cover bg-center relative"
              style={{ backgroundImage: 'url("/profile-banner.jpg")' }}
            >
              <div className="absolute inset-0 bg-black/10" />
            </div>
            <CardContent className="px-6 pb-6 pt-0 relative flex flex-col items-center">
              
              <div className="relative -mt-16 mb-4 group">
                <div className="size-32 rounded-full overflow-hidden border-4 border-white bg-white flex items-center justify-center relative shadow-lg">
                  {avatarLoading ? (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="size-8 animate-spin text-white" />
                    </div>
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || 'User Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-slate-100">
                      <User className="size-16 text-slate-400" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 size-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 active:scale-95 transition-all border-2 border-white"
                  title="Upload profile photo"
                  disabled={avatarLoading}
                >
                  <Camera className="size-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp" />
              </div>

              <div className="text-center w-full">
                <h2 className="text-xl font-extrabold text-slate-900 truncate">{profile?.full_name || 'Guest User'}</h2>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-sm text-slate-500">
                  <Mail className="size-4" />
                  <span className="truncate">{userEmail}</span>
                </div>
                {profile?.role === 'admin' && (
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Shield className="size-3.5" />
                    Workspace Admin
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        {/* Right Column: Forms */}
        <MotionDiv variants={fadeInUp} className="lg:col-span-8 space-y-6">
          
          {/* Personal Information Form */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
              <p className="text-sm text-slate-500 mt-1">Update your name, contact details, and date of birth.</p>
            </div>
            
            <CardContent className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                <AnimatePresence mode="popLayout">
                  {profileMessage && (
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-2 shadow-sm ${profileMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
                    >
                      {profileMessage.type === 'success' ? <CheckCircle className="size-5 shrink-0" /> : <ShieldAlert className="size-5 shrink-0" />}
                      <span>{profileMessage.text}</span>
                    </MotionDiv>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 h-11 bg-white border-slate-200 text-slate-900 rounded-lg focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 shadow-sm"
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 h-11 bg-white border-slate-200 text-slate-900 rounded-lg focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 shadow-sm"
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2 lg:col-span-1">
                    <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Date of Birth</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                        className="pl-10 h-11 bg-white border-slate-200 text-slate-900 rounded-lg focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 shadow-sm"
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button type="submit" className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-6">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Security</h3>
              <p className="text-sm text-slate-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
            </div>
            
            <CardContent className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-6">
                
                <AnimatePresence mode="popLayout">
                  {passwordMessage && (
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-2 shadow-sm ${passwordMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
                    >
                      {passwordMessage.type === 'success' ? <CheckCircle className="size-5 shrink-0" /> : <ShieldAlert className="size-5 shrink-0" />}
                      <span>{passwordMessage.text}</span>
                    </MotionDiv>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        type="password" required minLength={6} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 h-11 bg-white border-slate-200 text-slate-900 rounded-lg focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 shadow-sm"
                        disabled={updatePasswordMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        type="password" required minLength={6} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 h-11 bg-white border-slate-200 text-slate-900 rounded-lg focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 shadow-sm"
                        disabled={updatePasswordMutation.isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button type="submit" className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-md" disabled={updatePasswordMutation.isPending}>
                    {updatePasswordMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </MotionDiv>
      </MotionDiv>
    </main>
  );
}
