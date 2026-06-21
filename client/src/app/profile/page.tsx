"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export default function ProfileRedirect() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user) {
      router.replace(`/${user.role}/profile`);
    } else {
      router.replace('/auth/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}
