"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, School, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClassroomService, getMyClassroomsService } from "./classroom.service";
import { getOrganisationClassroomsService } from "../../manager/classrooms/classroom.service";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/lib/date";

interface Classroom {
  id: string;
  name: string;
  joinCode: string;
  joinCodeRevoked: boolean;
  createdAt: string;
}

export default function ClassroomsPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);

  const fetchClassrooms = async (search: string) => {
    setLoading(true);
    try {
      let res;
      if (user?.role === "manager") {
        res = await getOrganisationClassroomsService(search || undefined);
        setClassrooms(res.data || []);
      } else {
        res = await getMyClassroomsService(search || undefined);
        const rows = res.data || [];
        setClassrooms(rows.map((r: any) => r.classroom));
      }
    } catch {
      toast.error("Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    fetchClassrooms(debouncedSearch);
  }, [debouncedSearch, isInitialized, user]);

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      toast.error("Classroom name must be at least 2 characters");
      return;
    }
    setCreating(true);
    try {
      await createClassroomService({ name: name.trim() });
      toast.success("Classroom created");
      setDialogOpen(false);
      setName("");
      fetchClassrooms(debouncedSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create classroom");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Classrooms</h2>
          <p className="text-gray-400 mt-1">Manage your classrooms, rosters, and join codes.</p>
        </div>
        <Button
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-950/40"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Classroom
        </Button>
      </div>

      <div className="relative w-full max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
        <input
          type="text"
          placeholder="Search classrooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-white/30 h-11 rounded-xl text-sm transition-all shadow-inner pl-10"
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
              <>
                <p className="text-gray-400 max-w-sm mb-6">Create a classroom to start inviting students and organizing exams/assignments.</p>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setDialogOpen(true)}>
                  Create Classroom
                </Button>
              </>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Create Classroom</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-gray-300">Classroom Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Batch 2026 - Morning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
            />
            <p className="text-xs text-gray-500">
              A join code will be generated automatically (7-day expiry, 300 uses) — you can regenerate or revoke it anytime.
            </p>
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
