"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Hourglass, CalendarDays, Loader2, ArrowRight, ListChecks, Flag, CheckCircle } from "lucide-react";
import { verifyJoinCodeService, joinExamService } from "../../student.service";

export default function WaitingRoomPage() {
  const params = useParams();
  const joinCode = params.code as string;
  const router = useRouter();

  const [examData, setExamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [canJoinNow, setCanJoinNow] = useState(false);

  useEffect(() => {
    if (!joinCode) return;

    const fetchVerification = async () => {
      try {
        const verifyRes = await verifyJoinCodeService(joinCode);
        const exam = verifyRes.data || verifyRes;
        
        setExamData(exam);

        if (!exam.startTime) {
          // If no start time, they can join immediately
          setCanJoinNow(true);
          return;
        }

        const startMs = new Date(exam.startTime).getTime();
        const nowMs = new Date().getTime();

        if (nowMs >= startMs) {
          setCanJoinNow(true);
        } else {
          // Calculate seconds remaining
          setTimeLeft(Math.floor((startMs - nowMs) / 1000));
        }

      } catch (err: any) {
        toast.error(err.response?.data?.message || "Invalid or expired join code");
        router.push("/student");
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [joinCode, router]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || canJoinNow) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          setCanJoinNow(true);
          handleAutoJoin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, canJoinNow]);

  const handleAutoJoin = async () => {
    if (isJoining) return;
    setIsJoining(true);
    
    try {
      const res = await joinExamService(joinCode);
      toast.success("Exam has started! Good luck.");
      const submissionId = res.data?.submission?.id || res.submission?.id;
      if (submissionId) {
        router.push(`/student/exams/${submissionId}`);
      } else {
        router.push("/student");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to join exam");
      setIsJoining(false);
    }
  };

  const handleManualJoin = () => {
    handleAutoJoin();
  };

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-10 bg-[#0b0f19]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400">Verifying Exam Code...</p>
      </div>
    );
  }

  if (!examData) return null;

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 md:p-10 bg-[#0b0f19]">
      <Card className="w-full max-w-lg bg-[#111520] border-white/5 border-t-4 border-t-blue-500 shadow-2xl relative overflow-hidden">
        
        {/* Animated background pulse if waiting */}
        {!canJoinNow && (
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        )}

        <CardHeader className="text-center pb-2 relative z-10">
          <div className="mx-auto bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Hourglass className={`h-8 w-8 text-blue-400 ${!canJoinNow ? "animate-bounce" : ""}`} />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Waiting Room
          </CardTitle>
          <CardDescription className="text-gray-400 mt-2 text-base">
            You are enrolled in <span className="text-blue-300 font-semibold">{examData.title}</span>.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 relative z-10">
          {canJoinNow ? (
            <div className="text-center space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-emerald-400">
                <p className="text-lg font-semibold mb-1">The assessment is ready!</p>
                <p className="text-sm text-emerald-400/80">You will be redirected automatically...</p>
              </div>
              <Button 
                onClick={handleManualJoin}
                disabled={isJoining}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing Assessment...
                  </>
                ) : (
                  <>
                    Enter Assessment Now <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Countdown Display */}
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Starts In</p>
                <div className="font-mono text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-md">
                  {timeLeft !== null ? formatTime(timeLeft) : "--"}
                </div>
              </div>

              {/* Exam Metadata */}
              <div className="bg-black/20 border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <CalendarDays className="h-5 w-5 text-blue-400/70" />
                  <div>
                    <p className="text-xs text-gray-500">Scheduled Start</p>
                    <p className="font-medium">{new Date(examData.startTime).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Clock className="h-5 w-5 text-blue-400/70" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-medium">{examData.duration} Minutes</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {examData.instructions && examData.instructions.length > 0 && (
                <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <ListChecks className="h-5 w-5 text-purple-400" />
                    Instructions
                  </div>
                  <ul className="space-y-2">
                    {examData.instructions.map((inst: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Color Scheme Legend */}
              <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 space-y-3">
                <div className="text-white font-bold text-sm mb-2">Exam Legend</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">Answered</p>
                      <p className="text-[11px] text-gray-400 leading-snug">Indicates you have selected an answer.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/50 flex items-center justify-center shrink-0">
                      <Flag className="h-3 w-3 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-400">Flagged</p>
                      <p className="text-[11px] text-gray-400 leading-snug">Flag questions to review them later. They will be submitted with your other answers.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">
                Please wait on this page. You will be automatically redirected to the assessment when the timer reaches zero.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
