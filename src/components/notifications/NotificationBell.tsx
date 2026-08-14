'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2 } from 'lucide-react';
import { getNotifications, markNotificationsAsRead } from '@/app/actions/notifications';
import Link from 'next/link';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => await getNotifications(),
    refetchInterval: 30000, // Poll every 30s
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  React.useEffect(() => {
    let activeChannel: any = null;
    let supabaseClient: any = null;

    import('@/lib/supabase/client').then(({ createClient }) => {
      supabaseClient = createClient();
      supabaseClient.auth.getUser().then(({ data: { user } }: any) => {
        if (!user) return;
        
        // Remove existing channel if it exists
        supabaseClient.getChannels().forEach((ch: any) => {
          if (ch.topic === `realtime:user-notifications-${user.id}`) {
            supabaseClient.removeChannel(ch);
          }
        });

        activeChannel = supabaseClient.channel(`user-notifications-${user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            (payload: any) => {
              const newNotif = payload.new;
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New Notification', { body: newNotif.message });
              }
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }
          )
          .subscribe();
      });
    });

    return () => {
      if (activeChannel && supabaseClient) {
        supabaseClient.removeChannel(activeChannel);
      }
    };
  }, [queryClient]);

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const unreadCount = unreadNotifications.length;

  const markAsReadMutation = useMutation({
    mutationFn: async (ids: number[]) => await markNotificationsAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Mark all unread as read when opening
      markAsReadMutation.mutate(unreadNotifications.map(n => n.id));
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-black/10 transition-colors text-white"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-3 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-lg rounded-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 font-bold text-slate-800 flex justify-between items-center">
            <span>Notifications</span>
            <span className="text-xs font-normal text-slate-500">Last 50</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3 border-b border-slate-100 hover:bg-slate-50 text-sm ${!n.is_read ? 'bg-indigo-50/30' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-800">{n.message}</p>
                    {!n.is_read && <div className="size-2 bg-indigo-500 rounded-full shrink-0 mt-1" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  {n.link && (
                    <Link href={n.link} className="text-xs text-blue-600 mt-1 block">
                      View details
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
