"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  GraduationCap, ClipboardCheck, FileText, Mail, Phone, ArrowRight, Loader2, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/utils/axios";
import { formatDate } from "@/lib/date";

interface ExamRow {
  submissionId: string;
  examId: string;
  examTitle: string;
  classroomId?: string | null;
  totalMarks: number;
  score: number | null;
  status: string;
  submittedAt?: string | null;
}

interface AssignmentRow {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  classroomId?: string | null;
  totalMarks: number;
  totalMarksAwarded: number | null;
  status: string;
  submittedAt?: string | null;
}

interface Profile {
  student: { id: string; name: string; email: string; phone?: string | null; avatarUrl?: string | null };
  stats: {
    examsTaken: number;
    examsInProgress: number;
    totalExamScore: number;
    maxExamMarks: number;
    assignmentsSubmitted: number;
    assignmentsInProgress: number;
    totalAssignmentScore: number;
    maxAssignmentMarks: number;
  };
  exams: ExamRow[];
  assignments: AssignmentRow[];
}

export function StudentProfileView() {
  const params = useParams();
  const pathname = usePathname();
  const studentId = (params.studentId as string) || (params.id as string);
  const returnTo = encodeURIComponent(pathname || "");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const res = await api.get(`/student-profile/${studentId}`);
        setProfile(res.data?.data || null);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to load student profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  if (loading) return <div className="p-10 text-white text-center flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading student profile...</div>;
  if (!profile) return <div className="p-10 text-white text-center">Student profile not found</div>;

  const { student, stats } = profile;
  const examPct = stats.maxExamMarks > 0 ? Math.round((stats.totalExamScore / stats.maxExamMarks) * 100) : 0;
  const assignPct = stats.maxAssignmentMarks > 0 ? Math.round((stats.totalAssignmentScore / stats.maxAssignmentMarks) * 100) : 0;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      {/* Student header */}
      <Card className="bg-gradient-to-br from-[#1a1a1f] to-[#0f0f11] border-white/10 mb-6">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center sm:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-orange-400">{student.name?.[0]?.toUpperCase() || "S"}</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white">{student.name}</h2>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-5 mt-1.5 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-orange-400" /> {student.email}</span>
              {student.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-orange-400" /> {student.phone}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#0f0f11] border-white/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-11 w-11 bg-orange-600/20 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.examsTaken}</p>
              <p className="text-xs text-gray-500">Exams Taken</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f11] border-white/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-11 w-11 bg-emerald-600/20 rounded-lg flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.assignmentsSubmitted}</p>
              <p className="text-xs text-gray-500">Assignments Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f11] border-white/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-11 w-11 bg-[#1652F0]/20 rounded-lg flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-[#1652F0]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{examPct}%</p>
              <p className="text-xs text-gray-500">Exam Score Avg</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f11] border-white/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-11 w-11 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{assignPct}%</p>
              <p className="text-xs text-gray-500">Assignment Score Avg</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exams */}
      <h3 className="text-lg font-semibold text-white mb-3">Exams ({profile.exams.length})</h3>
      <Card className="bg-[#0f0f11] border-white/5 mb-6">
        <CardContent className="pt-6 space-y-2">
          {profile.exams.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No exams taken yet.</p>
          ) : (
            profile.exams.map((e) => {
              const pct = e.totalMarks > 0 ? Math.round(((e.score || 0) / e.totalMarks) * 100) : 0;
              return (
                <div key={e.submissionId} className="flex items-center justify-between gap-3 p-3.5 bg-[#0a0a0c] border border-white/5 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{e.examTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {e.status === "inprogress" ? "In Progress" : `Score: ${e.score ?? 0} / ${e.totalMarks} (${pct}%)`}
                      {e.submittedAt ? ` • ${formatDate(e.submittedAt)}` : ""}
                    </p>
                  </div>
                  {e.status !== "inprogress" && e.classroomId && (
                    <Link
                      href={`/teacher/classrooms/${e.classroomId}/exams/${e.examId}/results/${e.submissionId}?returnTo=${returnTo}`}
                      className="flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 shrink-0"
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Assignments */}
      <h3 className="text-lg font-semibold text-white mb-3">Assignments ({profile.assignments.length})</h3>
      <Card className="bg-[#0f0f11] border-white/5">
        <CardContent className="pt-6 space-y-2">
          {profile.assignments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No assignments submitted yet.</p>
          ) : (
            profile.assignments.map((a) => {
              const pct = a.totalMarks > 0 ? Math.round(((a.totalMarksAwarded || 0) / a.totalMarks) * 100) : 0;
              return (
                <div key={a.submissionId} className="flex items-center justify-between gap-3 p-3.5 bg-[#0a0a0c] border border-white/5 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.assignmentTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.status === "in_progress" ? "In Progress" : `Score: ${a.totalMarksAwarded ?? 0} / ${a.totalMarks} (${pct}%)`}
                      {a.submittedAt ? ` • ${formatDate(a.submittedAt)}` : ""}
                    </p>
                  </div>
                  {a.status !== "in_progress" && a.classroomId && (
                    <Link
                      href={`/teacher/classrooms/${a.classroomId}/assignments/${a.assignmentId}/submissions/${a.submissionId}?returnTo=${returnTo}`}
                      className="flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 shrink-0"
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}