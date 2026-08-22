"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutDashboard, School, Users, User, CreditCard, LogOut, ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { TooltipProvider } from "@/components/ui/tooltip";

const sidebarLinks = [
  { name: "Overview", href: "/manager", icon: LayoutDashboard },
  { name: "Organisation", href: "/manager/organisation", icon: Building2 },
  { name: "Classrooms", href: "/manager/classrooms", icon: School },
  { name: "Teachers", href: "/manager/teachers", icon: Users },
  { name: "Billing", href: "/manager/billing", icon: CreditCard },
  { name: "Profile", href: "/manager/profile", icon: User },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (isInitialized) {
      if (!user) {
        router.push("/auth/login");
      } else if (user.role !== "manager") {
        router.replace(`/${user.role}`);
      }
    }
  }, [user, isInitialized, router]);

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row h-screen w-full bg-[#050505] text-gray-100 font-sans overflow-hidden">

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#14151f] border-white/15 text-white placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-1.5 rounded-md shadow-lg shadow-orange-950/40">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">Abhyas Manager</span>
          </div>
          <button onClick={() => setIsMobileOpen(true)} className="p-2 -mr-2 text-gray-400 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-[#14151f] border-white/15 text-white placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30/60 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed md:relative z-50 h-full border-r border-white/10 flex flex-col bg-black shrink-0 transition-all duration-300",
          isCollapsed ? "md:w-20" : "md:w-64",
          "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>

          <button
            className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block absolute -right-3 top-8 bg-[#18181b] border border-white/10 rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10 shadow-md"
          >
            {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>

          <div className={cn("p-6 flex items-center gap-3 border-b border-white/10", isCollapsed ? "justify-center p-4" : "")}>
            <div className="bg-orange-600 p-2 rounded-lg shadow-lg shadow-orange-950/40 shrink-0">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Manager</h1>
                <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Abhyas</p>
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            {sidebarLinks.map((link) => {
              const isActive = link.href === "/manager" ? pathname === "/manager" : (pathname === link.href || pathname.startsWith(link.href + "/"));
              const Icon = link.icon;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  title={isCollapsed ? link.name : undefined}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isCollapsed ? "justify-center" : "gap-3",
                    isActive
                      ? "bg-orange-600 text-white font-semibold shadow-md shadow-orange-950/40"
                      : "text-white/70 hover:text-white hover:bg-zinc-900/80"
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-white" : "text-white/70")} />
                  {!isCollapsed && <span className="whitespace-nowrap">{link.name}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-2 mt-auto">
            {/* User Profile Badge */}
            <div className={cn(
              "flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-white/5",
              isCollapsed ? "justify-center" : ""
            )}>
              <div className="w-8 h-8 rounded-full bg-orange-600/30 border border-orange-500/40 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || "M"}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden whitespace-nowrap min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-tight">{user?.name || "Manager"}</p>
                  <p className="text-[10px] text-gray-400 truncate capitalize leading-tight">{user?.role || "Manager"}</p>
                </div>
              )}
            </div>

            <button
              onClick={async () => { await logout(); router.push("/auth/login"); }}
              title={isCollapsed ? "Sign Out" : undefined}
              className={cn(
                "w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-[#14151f] transition-all",
                isCollapsed ? "justify-center" : "gap-2.5"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#050505]">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
