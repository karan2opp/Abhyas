"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, LayoutDashboard, FileText, Database, BarChart, Settings, HelpCircle, LogOut, ChevronsLeft, ChevronsRight, Menu, X, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { TooltipProvider } from "@/components/ui/tooltip";

const sidebarLinks = [
  { name: "Overview", href: "/teacher", icon: LayoutDashboard },
  { name: "Exams", href: "/teacher/exams", icon: FileText },
  { name: "Results", href: "/teacher/results", icon: BarChart },
  { name: "Profile", href: "/teacher/profile", icon: User },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
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
      } else if (user.role !== "teacher") {
        router.replace(`/${user.role}`);
      }
    }
  }, [user, isInitialized, router]);

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row h-screen w-full bg-[#0a0d14] text-gray-100 font-sans overflow-hidden">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#111520] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-1.5 rounded-md shadow-lg shadow-indigo-900/50">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">Abiyaas</span>
          </div>
          <button onClick={() => setIsMobileOpen(true)} className="p-2 -mr-2 text-gray-400 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed md:relative z-50 h-full border-r border-white/5 flex flex-col bg-[#111520] shrink-0 transition-all duration-300",
          isCollapsed ? "md:w-20" : "md:w-64",
          "w-64", // Fixed width on mobile
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          
          {/* Close button for mobile inside sidebar */}
          <button 
            className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Toggle Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block absolute -right-3 top-8 bg-[#1a1f2e] border border-white/10 rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10 shadow-md"
          >
            {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>

          {/* Logo */}
          <div className={cn("p-6 flex items-center gap-3", isCollapsed ? "justify-center p-4" : "")}>
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-900/50 shrink-0">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Abiyaas</h1>
                <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Teacher Portal</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
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
                      ? "bg-white/5 text-purple-400" 
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{link.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-white/5 space-y-1">
            <button 
              onClick={async () => {
                await logout();
                router.push("/auth/login");
              }}
              title={isCollapsed ? "Sign Out" : undefined}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all",
                isCollapsed ? "justify-center" : "gap-3"
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#0b0f19]">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
