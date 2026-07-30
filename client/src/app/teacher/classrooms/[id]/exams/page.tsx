"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { listExamsForClassroomService, deleteExamService } from "../../../exams/exam.service";
import { formatDateTime } from "@/lib/date";

interface ExamEntry {
  id: string;
  title: string;
  type: "SCHEDULED" | "ON_DEMAND";
  totalMarks: number;
  groupId: string | null;
  joinCode: string;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  createdAt: string;
}

export default function ExamsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExams = async () => {
    try {
      const res = await listExamsForClassroomService(classroomId);
      setExams(res.data || []);
    } catch (err) {
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) loadExams();
  }, [classroomId]);

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!confirm(`Delete exam "${title}"? This permanently deletes its sections, questions, and submissions. This cannot be undone.`)) return;
    try {
      await deleteExamService(examId);
      toast.success("Exam deleted");
      loadExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete exam");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Exams ({exams.length})</h3>
          <p className="text-gray-400 text-sm mt-1">Exams can be class-wide or restricted to a group.</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => router.push(`/teacher/exams/new?classroomId=${classroomId}`)}
        >
          <Plus className="mr-2 h-4 w-4" /> New Exam
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-10">Loading exams...</div>
      ) : exams.length === 0 ? (
        <Card className="bg-[#111520] border-white/5 py-10 text-center">
          <CardContent>
            <FileText className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No exams yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {exams.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl hover:bg-[#1a1f2e] hover:border-white/10 transition-all"
            >
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => router.push(`/teacher/exams/${e.id}`)}
              >
                <div className="h-9 w-9 bg-yellow-600/20 text-yellow-400 rounded-lg flex items-center justify-center border border-yellow-500/20 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{e.title}</p>
                  <p className="text-gray-500 text-xs">
                    {e.groupId ? "Group-based" : "Class-wide"} · {e.totalMarks} marks · {e.duration}min
                    {e.type === "SCHEDULED" && e.startTime && ` · Starts ${formatDateTime(e.startTime)}`}
                    {e.type === "ON_DEMAND" && " · On-demand"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent border-white/10 text-white hover:bg-white/5"
                  onClick={() => router.push(`/teacher/exams/${e.id}/results`)}
                >
                  Results
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  onClick={() => handleDeleteExam(e.id, e.title)}
                  title="Delete exam"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
