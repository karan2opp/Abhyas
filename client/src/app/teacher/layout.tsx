"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, LayoutDashboard, FileText, Database, BarChart, Settings, HelpCircle, LogOut, ChevronsLeft, ChevronsRight, Menu, X, BookOpen, User, Sparkles, MessageSquare, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import api from "@/utils/axios";

const sidebarLinks = [
  { name: "Overview", href: "/teacher", icon: LayoutDashboard },
  { name: "Exams", href: "/teacher/exams", icon: FileText },
  { name: "Results", href: "/teacher/results", icon: BarChart },
  { name: "AI Assistant", href: "/teacher/chat", icon: Sparkles },
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
  
  const [chats, setChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/teacher/chat")) {
      const fetchChats = async () => {
        setLoadingChats(true);
        try {
          const res = await api.get("/chat");
          setChats(res.data.data || []);
        } catch (error) {
          console.error("Failed to fetch chats", error);
        } finally {
          setLoadingChats(false);
        }
      };
      fetchChats();
    }
  }, [pathname]);

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
            <span className="font-bold text-lg text-white tracking-tight">Abhyas</span>
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
                <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Abhyas</h1>
                <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Teacher Portal</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="px-4 py-4 space-y-1">
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

          {/* Chat List (Only on Chat Route) */}
          {pathname.startsWith("/teacher/chat") && !isCollapsed && (
            <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-white/5 space-y-2 custom-scrollbar">
              <div className="mb-4 mt-2">
                <Button 
                  onClick={() => router.push("/teacher/chat")}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2 justify-center rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  Start New Chat
                </Button>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Chats</span>
              </div>

              {loadingChats ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-4">No recent chats.</div>
              ) : (
                chats.map(chat => (
                  <Link 
                    key={chat._id} 
                    href={`/teacher/chat/${chat._id}`}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all relative overflow-hidden",
                      pathname.includes(chat._id) 
                        ? "bg-purple-500/10 text-purple-300 font-medium border border-purple-500/20 shadow-inner" 
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"
                    )}
                  >
                    {pathname.includes(chat._id) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1 bg-purple-500 rounded-r-full" />
                    )}
                    <div className="flex items-center gap-2 overflow-hidden z-10 relative">
                      <MessageSquare className={cn("h-4 w-4 shrink-0 transition-colors", pathname.includes(chat._id) ? "text-purple-400" : "text-gray-500")} />
                      <span className="truncate">{chat.title}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Spacer if chat list is not active to push bottom actions down */}
          {(!pathname.startsWith("/teacher/chat") || isCollapsed) && (
            <div className="flex-1" />
          )}

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
