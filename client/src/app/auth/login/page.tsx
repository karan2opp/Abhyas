"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

import { loginService } from '../auth.service';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore(state => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await loginService(data);
      
      const userData = response.data?.user || response.data;
      const token = response.data?.accessToken || response.accessToken;
      
      setUser(userData, token);
      toast.success("Successfully logged in");
      
      // Navigate based on role
      if (userData?.role === "superadmin") {
        router.push('/superadmin');
      } else if (userData?.role === "teacher") {
        router.push('/teacher');
      } else if (userData?.role === "admin") {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col space-y-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Welcome Back</h2>
        <p className="text-sm text-gray-400 mt-1">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-gray-300 ml-1">Institutional Email</label>
          <input 
            id="email" 
            type="email" 
            placeholder="name@university.edu" 
            className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-400 ml-1">{errors.email.message}</p>
          )}
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label htmlFor="password" className="text-xs font-medium text-gray-300">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-white hover:underline transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all pr-12"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 ml-1">{errors.password.message}</p>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-white text-black hover:bg-gray-200 font-semibold rounded-xl px-4 py-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-2"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </div>
          ) : "Sign In"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-white font-semibold hover:underline transition-colors">
          Create one now
        </Link>
      </div>
    </motion.div>
  );
}
