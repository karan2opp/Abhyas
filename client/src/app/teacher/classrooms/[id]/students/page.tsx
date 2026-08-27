"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Search, Users, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { getClassroomRosterService } from "../../classroom.service";

interface RosterEntry {
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  enrolledAt: string;
}

export default function StudentsPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const userRole = useAuthStore(state => state.user?.role);

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadRoster = async (search: string) => {
    try {
      const res = await getClassroomRosterService(classroomId, search || undefined);
      setRoster(res.data || []);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) loadRoster(debouncedSearch);
  }, [classroomId, debouncedSearch]);

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-6">
        <h3 className="text-2xl font-bold text-white">Students</h3>
        <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">{roster.length}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-white/30 h-11 rounded-xl text-sm transition-all shadow-inner pl-10"
          />
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-10">Loading students...</div>
        ) : roster.length === 0 ? (
          <Card className="bg-[#0f0f11]/50 border-white/5 py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <Users className="h-10 w-10 text-gray-500 mb-3" />
              <p className="text-gray-400">
                {debouncedSearch ? `No students matching "${debouncedSearch}".` : "No students have joined yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roster.map((s) => (
              <Card key={s.studentId} className="bg-[#0f0f11] border-white/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={s.name} avatarUrl={s.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-base truncate">{s.name}</p>
                        <p className="text-gray-500 text-sm truncate">{s.email}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-[#18181b]merald-500/15 text-emerald-200 border border-emerald-500/30" : "bg-zinc-800 text-white/70 border border-zinc-700"}`}>
                      {s.status}
                    </span>
                  </div>
                  <Link
                    href={userRole === "manager" ? `/manager/student-profile/${s.studentId}` : `/teacher/student-profile/${s.studentId}`}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#0a0a0c] text-gray-300 hover:text-white hover:border-orange-500/40 text-xs font-semibold py-2 transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Profile
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
