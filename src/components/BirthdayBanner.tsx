'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export function BirthdayBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const supabase = createClient();

  // Fetch profiles whose birthday is today
  const { data: birthdayUsers = [], isLoading } = useQuery({
    queryKey: ['birthdays_today'],
    queryFn: async () => {
      const today = new Date();
      // We need to match month and day. Supabase date functions or simple client filter
      // The most reliable way without complex SQL is fetching all and filtering, or if there's too many, an RPC.
      // Assuming not thousands of profiles for now, or fetch just non-null birthdays.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, date_of_birth')
        .not('date_of_birth', 'is', null);

      if (error) {
        // Silently ignore if column does not exist (user hasn't run migration)
        if (error.code !== '42703' && !error.message?.includes('date_of_birth')) {
          console.error('Error fetching birthdays:', error.message || error);
        }
        return [];
      }

      const todayMonth = today.getMonth() + 1;
      const todayDate = today.getDate();

      return data.filter((user) => {
        if (!user.date_of_birth) return false;
        // date_of_birth is usually 'YYYY-MM-DD'
        const [year, month, day] = user.date_of_birth.split('-');
        return parseInt(month, 10) === todayMonth && parseInt(day, 10) === todayDate;
      });
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading || birthdayUsers.length === 0) return null;

  const names = birthdayUsers.map((u) => u.full_name).join(' and ');
  const message = birthdayUsers.length > 1 
    ? `🎉 Happy Birthday to ${names}! 🎂` 
    : `🎉 Happy Birthday to ${names}! 🎂`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg overflow-hidden relative"
        >
          {/* Animated sparkles/background effect could go here */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
          
          <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
              >
                <Gift className="size-5 text-yellow-300" />
              </motion.div>
              <p className="font-bold text-sm sm:text-base drop-shadow-md">
                {message}
              </p>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors focus:outline-none"
              aria-label="Dismiss"
            >
              <X className="size-4 text-white/90" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
