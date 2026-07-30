"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listGroupsService } from "../../../../group.service";
import { createAssignmentService, listAssignmentsForClassroomService } from "../../../../../assignments/assignment.service";
import { formatDateTime } from "@/lib/date";

interface GroupEntry {
  id: string;
  name: string;
}

interface AssignmentEntry {
  id: string;
  title: string;
  totalMarks: number;
  startDate: string | null;
  dueDate: string | null;
}

export default function GroupAssignmentsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupEntry | null>(null);
  const [assignments, setAssignments] = useState<AssignmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  const loadAll = async () => {
    try {
      const [gRes, aRes] = await Promise.all([
        listGroupsService(classroomId),
        listAssignmentsForClassroomService(classroomId, { groupId }),
      ]);
      const found = (gRes.data || []).find((g: GroupEntry) => g.id === groupId);
      setGroup(found || null);
      setAssignments(aRes.data || []);
    } catch (err) {
      toast.error("Failed to load group assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) loadAll();
  }, [groupId]);

  const handleCreate = async () => {
    if (title.trim().length < 3) {
      toast.error("Assignment title must be at least 3 characters");
      return;
    }
    const marks = parseFloat(totalMarks);
    if (!marks || marks < 1) {
      toast.error("Total marks must be at least 1");
      return;
    }
    setCreating(true);
    try {
      const res = await createAssignmentService({
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        classroomId,
        groupId,
        totalMarks: marks,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      toast.success("Assignment created");
      setDialogOpen(false);
      setTitle("");
      setInstructions("");
      setTotalMarks("100");
      setStartDate("");
      setDueDate("");
      router.push(`/teacher/classrooms/${classroomId}/assignments/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-center py-10">Loading...</div>;

  return (
    <div>
      <button
        onClick={() => router.push(`/teacher/classrooms/${classroomId}/groups/${groupId}`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Group
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Group Assignments</h3>
          <p className="text-gray-400 text-base mt-1">Assignments for {group?.name || "this group"}.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card className="bg-[#111520] border-white/5 py-10 text-center">
          <CardContent>
            <ClipboardList className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No assignments for this group yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a) => (
            <Card
              key={a.id}
              onClick={() => router.push(`/teacher/classrooms/${classroomId}/assignments/${a.id}`)}
              className="bg-[#111520] border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20 shrink-0">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    {a.totalMarks} marks
                  </span>
                </div>
                <p className="text-white font-semibold text-base truncate">{a.title}</p>
                <div className="mt-3 pt-3 border-t border-white/5 text-sm text-gray-400 space-y-1">
                  {a.startDate && <p>Starts: {formatDateTime(a.startDate)}</p>}
                  {a.dueDate && <p>Due: <span className="text-red-400">{formatDateTime(a.dueDate)}</span></p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Assignment Dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111520] border border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Create New Assignment</DialogTitle>
            <p className="text-sm text-gray-400">
              Adding for <span className="text-blue-400 font-semibold">{group?.name}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Assignment Title</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Chapter 3 Homework"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Instructions (optional)</label>
              <textarea
                placeholder="Provide guidance or resources for students..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Start Date (optional)</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Due Date (optional)</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" size="lg" className="text-gray-300 hover:text-white" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Continue to Questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
