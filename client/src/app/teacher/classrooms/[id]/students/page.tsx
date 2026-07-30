"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
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
    } catch (err) {
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
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111520] border border-white/10 text-white placeholder:text-gray-500 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-white/20 transition-all text-sm"
          />
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-10">Loading students...</div>
        ) : roster.length === 0 ? (
          <Card className="bg-[#111520]/50 border-white/5 py-16 text-center">
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
              <Card key={s.studentId} className="bg-[#111520] border-white/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={s.name} avatarUrl={s.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-base truncate">{s.name}</p>
                        <p className="text-gray-500 text-sm truncate">{s.email}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-500/10 text-gray-400 border border-gray-500/20"}`}>
                      {s.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
