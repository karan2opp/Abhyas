"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, KeyRound, Users, UserPlus, ClipboardList, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getMyClassroomsService } from "../classroom.service";
import { getOrganisationClassroomsService } from "../../../manager/classrooms/classroom.service";
import { ClassroomContext, type Classroom } from "./ClassroomContext";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { href: "joincode", label: "Join Code", icon: KeyRound },
  { href: "students", label: "Students", icon: Users },
  { href: "teachers", label: "Teachers", icon: UserPlus },
  { href: "groups", label: "Groups", icon: Users },
  { href: "assignments", label: "Assignments", icon: ClipboardList },
  { href: "exams", label: "Exams", icon: FileText },
];

export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);

  const reloadClassroom = async () => {
    try {
      let res;
      if (user?.role === "manager") {
        res = await getOrganisationClassroomsService();
      } else {
        res = await getMyClassroomsService();
      }
      const list = user?.role === "manager" ? (res.data || []) : (res.data || []).map((r: any) => r.classroom);
      const found = list.find((c: Classroom) => c.id === classroomId);
      setClassroom(found || null);
    } catch {
      toast.error("Failed to load classroom");
    }
  };

  useEffect(() => {
    if (!classroomId || !isInitialized) return;
    (async () => {
      setLoading(true);
      await reloadClassroom();
      setLoading(false);
    })();
  }, [classroomId, isInitialized, user]);

  if (loading) return <div className="p-10 text-white text-center">Loading classroom...</div>;
  if (!classroom) return <div className="p-10 text-white text-center">Classroom not found</div>;

  return (
    <ClassroomContext.Provider value={{ classroom, reloadClassroom }}>
      <div className="flex h-full overflow-hidden">
        {/* ── Secondary Sidebar ─────────────────────────────────────── */}
        <aside className={`shrink-0 border-r border-white/10 bg-black flex flex-col transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}>
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                onClick={() => router.push(user?.role === "manager" ? "/manager/classrooms" : "/teacher/classrooms")}
                className={`flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors ${
                  isCollapsed ? "justify-center w-full" : ""
                }`}
                title={isCollapsed ? "All Classrooms" : undefined}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>All Classrooms</span>}
              </button>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title={isCollapsed ? "Open Left Sidebar" : "Close Left Sidebar"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4 text-orange-400" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            {!isCollapsed ? (
              <>
                <h2 className="text-2xl font-bold text-white tracking-tight truncate" title={classroom.name}>{classroom.name}</h2>
                <Link
                  href={`/teacher/classrooms/${classroomId}/settings`}
                  className={`flex items-center gap-1.5 text-sm mt-1.5 transition-colors ${
                    pathname === `/teacher/classrooms/${classroomId}/settings` ? "text-orange-400 font-semibold" : "text-gray-500 hover:text-orange-400"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" /> Update Classroom Info
                </Link>
              </>
            ) : (
              <div className="flex justify-center pt-1" title={classroom.name}>
                <Settings className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const href = `/teacher/classrooms/${classroomId}/${item.href}`;
              const isActive = pathname === href || pathname.startsWith(href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCollapsed ? "justify-center" : ""
                  } ${
                    isActive ? "bg-orange-600 text-white font-semibold shadow-md shadow-orange-950/40" : "text-white/70 hover:text-white hover:bg-zinc-900/80"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-white/70"}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Footer Section */}
          <div className="p-3 border-t border-white/10 mt-auto shrink-0">
            <div className={`flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-white/5 ${
              isCollapsed ? "justify-center" : ""
            }`}>
              <div className="w-8 h-8 rounded-full bg-orange-600/30 border border-orange-500/40 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden whitespace-nowrap min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-tight">{user?.name || "User"}</p>
                  <p className="text-[10px] text-gray-400 truncate capitalize leading-tight">{user?.role || "Teacher"}</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Section Content ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {children}
        </main>
      </div>
    </ClassroomContext.Provider>
  );
}
