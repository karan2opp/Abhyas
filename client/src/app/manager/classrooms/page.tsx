"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { School, ChevronRight, Search, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getOrganisationClassroomsService } from "./classroom.service";
import { formatDate } from "@/lib/date";

interface Classroom {
  id: string;
  name: string;
  joinCode: string;
  joinCodeRevoked: boolean;
  createdAt: string;
}

export default function ManagerClassroomsPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getOrganisationClassroomsService(debouncedSearch || undefined);
        setClassrooms(res.data || []);
      } catch (err) {
        toast.error("Failed to load classrooms");
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedSearch]);

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight">Classrooms</h2>
        <p className="text-gray-400 mt-1">All classrooms across your organisation.</p>
      </div>

      <div className="relative w-full sm:w-72 mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
        <input
          type="text"
          placeholder="Search classrooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-white/30 h-11 rounded-xl text-sm transition-all shadow-inner pl-10"
        />
      </div>

      {loading ? (
        <div className="text-white text-center py-10">Loading classrooms...</div>
      ) : classrooms.length === 0 ? (
        <Card className="bg-[#0f0f11]/50 border-white/5 py-16 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <School className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {debouncedSearch ? `No classrooms matching "${debouncedSearch}"` : "No classrooms yet"}
            </h3>
            {!debouncedSearch && (
              <p className="text-gray-400 max-w-sm">Classrooms are created by teachers in your organisation — none exist yet.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              onClick={() => router.push(`/teacher/classrooms/${classroom.id}`)}
              className="flex items-center justify-between p-4 bg-[#0f0f11] border border-white/5 rounded-xl hover:bg-[#18181b] hover:border-white/10 transition-all gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-orange-950/40">
                  <School className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-white leading-tight truncate">{classroom.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Created {formatDate(classroom.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {classroom.joinCodeRevoked ? (
                  <span className="px-3 py-1 bg-red-500/15 border border-red-500/30 rounded-full text-red-300 text-xs font-semibold">
                    Code Revoked
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-mono font-semibold tracking-wide">
                    {classroom.joinCode}
                  </span>
                )}
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
