"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, ClipboardCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { getAssignmentByIdService, getSubmissionsForAssignmentService } from "../../../../../assignments/assignment.service";

const PAGE_SIZE = 10;

interface SubmissionEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl: string | null;
  status: "in_progress" | "submitted" | "graded";
  submittedAt: string | null;
  isLate: boolean;
  totalMarksAwarded: number | null;
}

export default function AssignmentSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const assignmentId = params.assignmentId as string;

  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState(0);
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAssignmentByIdService(assignmentId);
        setAssignmentTitle(res.data?.title || "");
        setTotalMarks(res.data?.totalMarks || 0);
      } catch (err) {
        toast.error("Failed to load assignment");
      }
    })();
  }, [assignmentId]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadSubmissions = async (targetPage: number, search: string, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await getSubmissionsForAssignmentService(assignmentId, {
        search: search || undefined,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      const newData: SubmissionEntry[] = res.data?.data || [];
      setSubmissions((prev) => (append ? [...prev, ...newData] : newData));
      setTotal(res.data?.total || 0);
      setHasMore(!!res.data?.hasMore);
      setPage(targetPage);
    } catch (err) {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (assignmentId) loadSubmissions(1, debouncedSearch, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, debouncedSearch]);

  const statusBadge = (s: SubmissionEntry) => {
    const styles: Record<string, string> = {
      in_progress: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      submitted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      graded: "bg-emerald-600/10 text-emerald-400 border-emerald-500/20",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${styles[s.status]}`}>
        {s.status.replace("_", " ")}
        {s.isLate && s.status !== "in_progress" ? " · late" : ""}
      </span>
    );
  };

  return (
    <div>
      <button
        onClick={() => router.push(`/teacher/classrooms/${classroomId}/assignments/${assignmentId}`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Assignment
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Submissions ({total})</h2>
        <p className="text-gray-400 text-base mt-1">{assignmentTitle}</p>
      </div>

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#111520] border border-white/10 text-white placeholder:text-gray-500 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-white/20 transition-all text-sm"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-10">Loading...</div>
      ) : submissions.length === 0 ? (
        <Card className="bg-[#111520] border-white/5 py-14 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <ClipboardCheck className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-white font-semibold text-base">
              {debouncedSearch ? `No students matching "${debouncedSearch}"` : "No submissions yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {submissions.map((s) => (
              <Card
                key={s.id}
                onClick={() => router.push(`/teacher/classrooms/${classroomId}/assignments/${assignmentId}/submissions/${s.id}`)}
                className="bg-[#111520] border-white/5 hover:border-white/10 transition-all cursor-pointer"
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar name={s.studentName} avatarUrl={s.avatarUrl} />
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-base truncate">{s.studentName}</p>
                      <p className="text-gray-500 text-sm truncate">{s.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {statusBadge(s)}
                    {s.totalMarksAwarded !== null && (
                      <span className="text-emerald-400 text-sm font-bold">{s.totalMarksAwarded}/{totalMarks}</span>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                className="bg-transparent border-white/10 text-white hover:bg-white/5"
                onClick={() => loadSubmissions(page + 1, debouncedSearch, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
