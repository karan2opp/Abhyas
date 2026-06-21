"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isInitialized && user && pathname !== '/auth/forgot-password') {
      router.replace(`/${user.role}`);
    }
  }, [isInitialized, user, router, pathname]);

  // Don't render the auth layout if we're going to redirect or haven't mounted
  if (!mounted || (isInitialized && user && pathname !== '/auth/forgot-password')) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden font-sans">
      
      {/* Sleek Black Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] opacity-20 pointer-events-none"></div>

      {/* Subtle Spotlight Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-[#09090b] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50"
        >
          {/* Logo / Header inside the card */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-white/5 font-extrabold text-2xl text-black">
              A
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Abiyaas</h1>
            <p className="text-sm text-gray-400 mt-1">Institutional Assessment Platform</p>
          </div>

          {children}

        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-600 mt-6"
        >
          &copy; {new Date().getFullYear()} Abiyaas. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}
