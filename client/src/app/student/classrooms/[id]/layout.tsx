"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, FileText, Layers } from "lucide-react";
import { toast } from "sonner";
import { getMyClassroomsService } from "../classroom.service";
import { ClassroomContext, type Classroom } from "./ClassroomContext";

const navItems = [
  { href: "assignments", label: "Assignments", icon: ClipboardList },
  { href: "exams", label: "Exams", icon: FileText },
  { href: "groups", label: "Groups", icon: Layers },
];

export default function StudentClassroomLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadClassroom = async () => {
    try {
      const res = await getMyClassroomsService();
      const found = (res.data || []).map((r: any) => r.classroom).find((c: Classroom) => c.id === classroomId);
      setClassroom(found || null);
    } catch (err) {
      toast.error("Failed to load classroom");
    }
  };

  useEffect(() => {
    if (!classroomId) return;
    (async () => {
      setLoading(true);
      await reloadClassroom();
      setLoading(false);
    })();
  }, [classroomId]);

  if (loading) return <div className="p-10 text-white text-center">Loading classroom...</div>;
  if (!classroom) return <div className="p-10 text-white text-center">Classroom not found</div>;

  return (
    <ClassroomContext.Provider value={{ classroom, reloadClassroom }}>
      <div className="flex h-full overflow-hidden">
        {/* ── Secondary Sidebar ─────────────────────────────────────── */}
        <aside className="w-64 shrink-0 border-r border-white/5 bg-[#0d1117] flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-white/5">
            <button
              onClick={() => router.push("/student/classrooms")}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-3 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> All Classrooms
            </button>

            <h2 className="text-2xl font-bold text-white tracking-tight truncate" title={classroom.name}>{classroom.name}</h2>
            <p className="text-gray-500 text-sm mt-1.5">Exams and assignments available to you here.</p>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const href = `/student/classrooms/${classroomId}/${item.href}`;
              const isActive = pathname === href || pathname.startsWith(href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── Section Content ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-10">
          {children}
        </main>
      </div>
    </ClassroomContext.Provider>
  );
}
