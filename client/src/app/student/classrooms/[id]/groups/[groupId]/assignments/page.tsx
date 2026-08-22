"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getMyAssignmentsService } from "../../../../../assignments/assignment.service";
import { formatDateTime } from "@/lib/date";

interface AssignmentEntry {
  id: string;
  title: string;
  totalMarks: number;
  startDate: string | null;
  dueDate: string | null;
  sequenceOrder: number | null;
  locked: boolean;
  unlocksAt: string | null;
  reason: "time" | "previous_incomplete" | null;
  groupId: string | null;
}

export default function StudentGroupAssignmentsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const groupId = params.groupId as string;

  const [assignments, setAssignments] = useState<AssignmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getMyAssignmentsService(classroomId);
        const filtered = (res.data || []).filter((a: AssignmentEntry) => a.groupId === groupId);
        const sorted = [...filtered].sort((a, b) => {
          if (a.sequenceOrder && b.sequenceOrder) return a.sequenceOrder - b.sequenceOrder;
          if (a.sequenceOrder) return -1;
          if (b.sequenceOrder) return 1;
          return 0;
        });
        setAssignments(sorted);
      } catch (err) {
        toast.error("Failed to load assignments");
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId, groupId]);

  if (loading) return <div className="text-gray-400 text-center py-10">Loading...</div>;

  return (
    <div>
      <button
        onClick={() => router.push(`/student/classrooms/${classroomId}/groups/${groupId}`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Group
      </button>

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Group Assignments ({assignments.length})</h3>
      </div>

      {assignments.length === 0 ? (
        <Card className="bg-[#0f0f11] border-white/5 py-10 text-center">
          <CardContent>
            <ClipboardList className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No assignments for this group yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between p-4 border rounded-xl ${a.locked ? "bg-[#0f0f11]/50 border-white/5" : "bg-[#0f0f11] border-white/5"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${a.locked ? "bg-zinc-800 text-white/60 border-zinc-700" : "bg-orange-600/20 text-indigo-200 border-indigo-500/30"}`}>
                  {a.locked ? <Lock className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${a.locked ? "text-white/60" : "text-white"}`}>
                    {a.sequenceOrder && `#${a.sequenceOrder}: `}{a.title}
                  </p>
                  <p className="text-white/60 text-xs">
                    {a.totalMarks} marks
                    {!a.locked && a.startDate && ` · Started ${formatDateTime(a.startDate)}`}
                    {a.dueDate && ` · Due ${formatDateTime(a.dueDate)}`}
                    {a.locked && a.reason === "time" && a.unlocksAt && ` · Unlocks ${formatDateTime(a.unlocksAt)}`}
                    {a.locked && a.reason === "previous_incomplete" && ` · Complete the previous one first`}
                  </p>
                </div>
              </div>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-40"
                onClick={() => router.push(`/student/assignments/${a.id}`)}
                disabled={a.locked}
              >
                {a.locked ? "Locked" : "Open"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
