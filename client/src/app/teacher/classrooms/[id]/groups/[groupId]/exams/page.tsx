"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { listGroupsService } from "../../../../group.service";
import { listExamsForClassroomService, deleteExamService } from "../../../../../exams/exam.service";
import { formatDateTime } from "@/lib/date";

interface GroupEntry {
  id: string;
  name: string;
}

interface ExamEntry {
  id: string;
  title: string;
  type: "SCHEDULED" | "ON_DEMAND";
  totalMarks: number;
  startTime: string | null;
  duration: number;
}

export default function GroupExamsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupEntry | null>(null);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [gRes, eRes] = await Promise.all([
        listGroupsService(classroomId),
        listExamsForClassroomService(classroomId, groupId),
      ]);
      const found = (gRes.data || []).find((g: GroupEntry) => g.id === groupId);
      setGroup(found || null);
      setExams(eRes.data || []);
    } catch (err) {
      toast.error("Failed to load group exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) loadAll();
  }, [groupId]);

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!confirm(`Delete exam "${title}"? This permanently deletes its sections, questions, and submissions. This cannot be undone.`)) return;
    try {
      await deleteExamService(examId);
      toast.success("Exam deleted");
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete exam");
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
          <h3 className="text-2xl font-bold text-white">Group Exams</h3>
          <p className="text-gray-400 text-base mt-1">Exams for {group?.name || "this group"}.</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          onClick={() => router.push(`/teacher/exams/new?classroomId=${classroomId}&groupId=${groupId}`)}
        >
          <Plus className="mr-2 h-4 w-4" /> New Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card className="bg-[#111520] border-white/5 py-10 text-center">
          <CardContent>
            <FileText className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No exams for this group yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((e) => (
            <Card key={e.id} className="bg-[#111520] border-white/5 hover:border-white/10 transition-all">
              <CardContent className="p-5">
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/teacher/exams/${e.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-9 w-9 bg-yellow-600/20 text-yellow-400 rounded-lg flex items-center justify-center border border-yellow-500/20 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      {e.totalMarks} marks
                    </span>
                  </div>
                  <p className="text-white font-semibold text-base truncate">{e.title}</p>
                  <div className="mt-3 pt-3 border-t border-white/5 text-sm text-gray-400 space-y-1">
                    <p>{e.duration} min</p>
                    {e.type === "SCHEDULED" && e.startTime && <p>Starts: {formatDateTime(e.startTime)}</p>}
                    {e.type === "ON_DEMAND" && <p>On-demand</p>}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-white/10 text-white hover:bg-white/5"
                    onClick={() => router.push(`/teacher/exams/${e.id}/results`)}
                  >
                    Results
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDeleteExam(e.id, e.title)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
