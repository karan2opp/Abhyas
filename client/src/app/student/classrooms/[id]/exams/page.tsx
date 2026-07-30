"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getMyExamsService, startScopedExamService } from "../../../student.service";
import { formatDateTime } from "@/lib/date";

interface ExamEntry {
  id: string;
  title: string;
  type: "SCHEDULED" | "ON_DEMAND";
  totalMarks: number;
  startTime: string | null;
  endTime: string | null;
}

export default function StudentClassroomExamsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getMyExamsService(classroomId);
        setExams(res.data || []);
      } catch (err) {
        toast.error("Failed to load exams");
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId]);

  const handleStartExam = async (examId: string) => {
    setStartingExamId(examId);
    try {
      const res = await startScopedExamService(examId);
      router.push(`/student/exams/${res.data.submission.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start exam");
      setStartingExamId(null);
    }
  };

  if (loading) return <div className="text-gray-400 text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Exams ({exams.length})</h2>
        <p className="text-gray-400 text-base mt-1">Exams available to you in this classroom.</p>
      </div>

      {exams.length === 0 ? (
        <Card className="bg-[#111520] border-white/5 py-10 text-center">
          <CardContent>
            <FileText className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No exams available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {exams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{exam.title}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {exam.type === "SCHEDULED" && exam.startTime
                      ? `${formatDateTime(exam.startTime)} - ${exam.endTime ? formatDateTime(exam.endTime) : ""}`
                      : "On-demand"}
                    {" · "}{exam.totalMarks} marks
                  </p>
                </div>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleStartExam(exam.id)}
                disabled={startingExamId === exam.id}
              >
                {startingExamId === exam.id ? "Starting..." : "Start Exam"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
