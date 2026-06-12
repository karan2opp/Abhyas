"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, CheckCircle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { joinExamService, getMySubmissionsService, verifyJoinCodeService } from "./student.service";

export default function StudentDashboard() {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSubmissions = async () => {
    try {
      const res = await getMySubmissionsService();
      setSubmissions(res.data || []);
    } catch (err: any) {
      if (err.response?.status !== 403) {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    try {
      // 1. Verify the join code first
      const verifyRes = await verifyJoinCodeService(joinCode.toUpperCase());
      const exam = verifyRes.data || verifyRes;

      // 2. Check if exam has a future start time
      if (exam.startTime && new Date() < new Date(exam.startTime)) {
        router.push(`/student/waiting/${joinCode.toUpperCase()}`);
        return;
      }

      // 3. Otherwise, join immediately
      const res = await joinExamService(joinCode.toUpperCase());
      toast.success("Joined exam successfully!");
      const submissionId = res.data?.submission?.id || res.submission?.id;
      if (submissionId) {
        router.push(`/student/exams/${submissionId}`);
      } else {
        fetchSubmissions(); // fallback
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to join exam");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="p-4 sm:p-10 flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Student Dashboard</h2>
        <p className="text-gray-400 mt-1">Join new assessments and view your past performance.</p>
      </header>

      {/* Join Exam Section */}
      <div className="flex gap-4">
        <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
          placeholder="enter the join code"
          className="outline-none bg-gray-900 p-2 rounded-lg "
        />
        <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg" onClick={handleJoinExam}>Join Exam</button>
      </div>

      {/* Submissions Section */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">My Assessments</h3>
        {loading ? (
          <div className="text-gray-400">Loading your assessments...</div>
        ) : submissions.length === 0 ? (
          <Card className="bg-[#111520] border-white/5 py-10 text-center">
            <CardContent>
              <FileText className="h-10 w-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">You haven't joined any assessments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {submissions.map((item) => {
              const { submission, exam } = item;
              const isCompleted = submission.status === "submitted" || submission.status === "timeout";

              return (
                <Card key={submission.id} className="bg-[#111520] border-white/5 hover:border-blue-500/30 transition-colors shadow-lg overflow-hidden group">
                  <div className={`h-2 ${isCompleted ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-blue-500 to-indigo-600"}`}></div>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white leading-tight mb-2 line-clamp-2">
                      {exam.title}
                    </h3>

                    <div className="space-y-2 mt-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span>Duration: {exam.duration} mins</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Play className="h-4 w-4 text-blue-400" />
                        )}
                        <span>Status: <span className={isCompleted ? "text-emerald-400" : "text-blue-400"}>{submission.status.toUpperCase()}</span></span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      {isCompleted ? (
                        <>
                          <div className="text-sm font-semibold text-white">
                            Score: <span className="text-emerald-400">{submission.score ?? 0} / {exam.totalMarks}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                            onClick={() => router.push(`/student/results/${submission.id}`)}
                          >
                            View Result
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-gray-400">Not submitted yet</div>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => router.push(`/student/exams/${submission.id}`)}
                          >
                            Resume
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
