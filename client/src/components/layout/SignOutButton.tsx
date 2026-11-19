"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/** Signs the user out and goes to the login page. `collapsed` is for a narrowed sidebar: only the icon, with a tooltip. */
export function SignOutButton({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  return (
    <button
      type="button"
      onClick={async () => {
        await logout();
        router.push("/auth/login");
      }}
      title={collapsed ? "Sign Out" : undefined}
      className={cn(
        "w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-[#14151f] transition-all",
        collapsed ? "justify-center" : "gap-2.5",
        className
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="whitespace-nowrap">Sign Out</span>}
    </button>
  );
}
