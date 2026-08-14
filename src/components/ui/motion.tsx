'use client';

import { motion } from 'framer-motion';

export const MotionDiv = motion.div;
export const MotionButton = motion.button;

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } // Custom cubic-bezier for premium feel
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export const scaleHover = {
  whileHover: { scale: 1.015, y: -1 },
  whileTap: { scale: 0.985, y: 0 }
};

export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(168, 85, 247, 0)',
      '0 0 0 8px rgba(168, 85, 247, 0.1)',
      '0 0 0 0 rgba(168, 85, 247, 0)'
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};
