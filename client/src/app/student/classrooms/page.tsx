"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { School, Plus, ChevronRight } from "lucide-react";
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
import { getMyClassroomsService, joinClassroomService } from "./classroom.service";
import { formatDate } from "@/lib/date";

interface Classroom {
  id: string;
  name: string;
  createdAt: string;
}

export default function StudentClassroomsPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const res = await getMyClassroomsService();
      const rows = res.data || [];
      setClassrooms(rows.map((r: any) => r.classroom));
    } catch {
      toast.error("Failed to load your classrooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleJoin = async () => {
    if (code.trim().length < 6) {
      toast.error("Enter a valid join code");
      return;
    }
    setJoining(true);
    try {
      const res = await joinClassroomService(code.trim().toUpperCase());
      toast.success(res.message || "Joined classroom successfully");
      setDialogOpen(false);
      setCode("");
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to join classroom");
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading classrooms...</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Classrooms</h2>
          <p className="text-gray-400 mt-1">Classrooms you've joined.</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-5 w-5" />
          Join Classroom
        </Button>
      </div>

      {classrooms.length === 0 ? (
        <Card className="bg-[#0f0f11]/50 border-white/5 py-16 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <School className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No classrooms yet</h3>
            <p className="text-gray-400 max-w-sm mb-6">
              Enter a join code from your teacher, or use the code from your invite email, to get started.
            </p>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setDialogOpen(true)}>
              Join Classroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              onClick={() => router.push(`/student/classrooms/${classroom.id}`)}
              className="flex items-center justify-between p-4 bg-[#0f0f11] border border-white/5 rounded-xl hover:bg-[#18181b] hover:border-white/10 transition-all gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 bg-orange-600/20 text-orange-400 rounded-lg flex items-center justify-center shrink-0 border border-orange-500/30">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-white leading-tight truncate">{classroom.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Joined {formatDate(classroom.createdAt)}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 shrink-0" />
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Join a Classroom</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-gray-300">Join / Invite Code</label>
            <input
              autoFocus
              type="text"
              maxLength={8}
              placeholder="ABC12XYZ"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-center text-xl tracking-widest font-mono uppercase"
            />
            <p className="text-xs text-gray-500">
              Works with either a shared classroom code or a personal invite code emailed to you.
            </p>
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleJoin} disabled={joining}>
              {joining ? "Joining..." : "Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
