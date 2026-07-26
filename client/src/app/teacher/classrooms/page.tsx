"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, School, Users, ChevronRight } from "lucide-react";
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

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const res = await getMyClassroomsService();
      const rows = res.data || [];
      setClassrooms(rows.map((r: any) => r.classroom));
    } catch (err) {
      toast.error("Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

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
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create classroom");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading classrooms...</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Classrooms</h2>
          <p className="text-gray-400 mt-1">Manage your classrooms, rosters, and join codes.</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Classroom
        </Button>
      </div>

      {classrooms.length === 0 ? (
        <Card className="bg-[#111520]/50 border-white/5 py-16 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <School className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No classrooms yet</h3>
            <p className="text-gray-400 max-w-sm mb-6">Create a classroom to start inviting students and organizing exams/assignments.</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDialogOpen(true)}>
              Create Classroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              onClick={() => router.push(`/teacher/classrooms/${classroom.id}`)}
              className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl hover:bg-[#1a1f2e] hover:border-white/10 transition-all gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 bg-[#1652F0]/20 text-[#1652F0] rounded-lg flex items-center justify-center shrink-0 border border-[#1652F0]/20">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-white leading-tight truncate">{classroom.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Created {new Date(classroom.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {classroom.joinCodeRevoked ? (
                  <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-semibold">
                    Code Revoked
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-600/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono font-semibold">
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
        <DialogContent className="bg-[#111520] border border-white/10 text-white sm:max-w-md">
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
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
