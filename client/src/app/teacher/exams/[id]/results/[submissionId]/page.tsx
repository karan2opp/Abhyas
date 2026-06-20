"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trophy, ArrowLeft, Clock, Calendar, Check, X, Bot } from "lucide-react";
import { getSubmissionByIdService, getExamForSubmissionService } from "@/app/student/student.service";
import { toast } from "sonner";
import Link from "next/link";

export default function ResultsPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const examId = params.id as string;
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!submissionId) return;

    const fetchResult = async () => {
      try {
        const [subRes, examRes] = await Promise.all([
          getSubmissionByIdService(submissionId),
          getExamForSubmissionService(submissionId)
        ]);

        const subData = subRes.data || subRes;
        const examData = examRes.data || examRes;

        if (subData.status === "inprogress") {
          toast.info("This exam is still in progress.");
          router.replace(`/student/exams/${submissionId}`);
          return;
        }

        setSubmission(subData);
        setExam(examData);
      } catch (err) {
        toast.error("Failed to load results.");
        router.push("/student");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
    
    // Polling mechanism if evaluating
    let interval: NodeJS.Timeout;
    if (submission?.status === "evaluating") {
      interval = setInterval(() => {
        fetchResult();
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [submissionId, router, submission?.status]);

  if (loading) return <div className="p-10 text-white text-center">Loading results...</div>;
  if (!submission || !exam) return <div className="p-10 text-white text-center">Result not found.</div>;

  const score = submission.score ?? 0;
  const totalMarks = exam.totalMarks ?? 0;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  if (submission.status === "evaluating") {
    return (
      <div className="p-10 h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Evaluating Your Results...</h2>
        <p className="text-gray-400 text-center max-w-md">
          Our AI is currently reviewing and scoring your descriptive answers. This page will automatically update in a few moments once the evaluation is complete.
        </p>
      </div>
    );
  }

  // Determine performance color
  let colorClass = "text-red-500";
  let bgClass = "bg-red-500/10";
  let borderClass = "border-red-500/20";
  let message = "Keep practicing!";
  
  if (percentage >= 80) {
    colorClass = "text-emerald-500";
    bgClass = "bg-emerald-500/10";
    borderClass = "border-emerald-500/20";
    message = "Excellent work!";
  } else if (percentage >= 50) {
    colorClass = "text-yellow-500";
    bgClass = "bg-yellow-500/10";
    borderClass = "border-yellow-500/20";
    message = "Good effort!";
  }

  // Count correct/incorrect from answers if they exist
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  // To calculate skipped, we'd need to know total questions
  let totalQuestions = 0;
  exam.sections?.forEach((s: any) => {
    totalQuestions += (s.questions?.length || 0);
  });

  submission.answers?.forEach((ans: any) => {
    if (ans.isCorrect === true) correctCount++;
    else if (ans.isCorrect === false) incorrectCount++;
  });

  skippedCount = totalQuestions - (correctCount + incorrectCount);

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <Link href={`/teacher/exams/${examId}/results`} className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to All Results
        </Link>

        <Card className="bg-[#111520] border-white/5 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          
          <CardHeader className="text-center pt-10 pb-2">
            <div className="mx-auto w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <Trophy className="h-10 w-10 text-blue-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Assessment Completed</CardTitle>
            <CardDescription className="text-gray-400 text-lg">
              {exam.title}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-10 pb-10">
            {/* Score Ring */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className={`relative flex items-center justify-center w-48 h-48 rounded-full border-8 ${borderClass} ${bgClass} shadow-lg`}>
                <div className="text-center">
                  <div className={`text-5xl font-extrabold ${colorClass} tracking-tighter`}>
                    {percentage}%
                  </div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-widest mt-1">
                    Score
                  </div>
                </div>
              </div>
              <div className={`mt-6 font-bold text-xl ${colorClass}`}>{message}</div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 border-t border-white/5 pt-8">
              <div className="bg-black/20 rounded-xl p-4 text-center border border-white/5">
                <div className="text-2xl font-bold text-white mb-1">{score} <span className="text-sm text-gray-500 font-normal">/ {totalMarks}</span></div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Marks</div>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400 mb-1">{correctCount}</div>
                <div className="text-xs text-emerald-500/70 uppercase tracking-wider font-semibold">Correct</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 text-center border border-red-500/20">
                <div className="text-2xl font-bold text-red-400 mb-1">{incorrectCount}</div>
                <div className="text-xs text-red-500/70 uppercase tracking-wider font-semibold">Incorrect</div>
              </div>
              <div className="bg-gray-500/10 rounded-xl p-4 text-center border border-gray-500/20">
                <div className="text-2xl font-bold text-gray-300 mb-1">{skippedCount}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Skipped</div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center justify-center gap-8 mt-10 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Submitted: {new Date(submission.submittedAt || submission.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Status: <span className="text-emerald-400 capitalize">{submission.status}</span></span>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Detailed Review Section */}
        <div className="mt-12 space-y-8 pb-20">
          <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">Detailed Review</h3>
          {exam.sections?.map((section: any, sIdx: number) => (
            <div key={section.id} className="space-y-6">
              {exam.sections.length > 1 && (
                <h4 className="text-xl font-semibold text-gray-300 mb-4">{section.title}</h4>
              )}
              {section.questions?.map((question: any, qIdx: number) => {
                const answer = submission.answers?.find((a: any) => a.questionId === question.id);
                const isDescriptive = question.type === "descriptive";
                
                return (
                  <Card key={question.id} className="bg-[#111520]/80 border-white/5 shadow-xl backdrop-blur-xl">
                    <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.02]">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-lg font-medium text-white leading-relaxed">
                          <span className="text-gray-500 mr-2">Q{qIdx + 1}.</span> 
                          {question.description}
                        </CardTitle>
                        <div className="flex flex-col items-end shrink-0">
                          <div className={`text-sm font-bold px-3 py-1 rounded-full border ${
                            answer?.isCorrect 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : answer?.marksAwarded > 0 
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {answer?.marksAwarded ?? 0} / {question.marks} Marks
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {isDescriptive ? (
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-2 font-medium">Your Answer:</div>
                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-gray-300 whitespace-pre-wrap font-mono text-sm">
                              {answer?.textAnswer || <span className="text-gray-600 italic">No answer provided.</span>}
                            </div>
                          </div>
                          
                          {answer?.feedback && (
                            <div className="mt-6 p-5 rounded-xl bg-blue-900/10 border border-blue-500/20 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                              <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/20 p-2 rounded-lg shrink-0">
                                  <Bot className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                  <div className="text-sm text-blue-400 mb-1 font-semibold tracking-wide uppercase">AI Evaluation</div>
                                  <div className="text-gray-300 text-sm leading-relaxed">{answer.feedback}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {question.options?.map((opt: any) => {
                            const isSelected = answer?.options?.includes(opt.id);
                            const isActualCorrect = opt.isCorrect;
                            
                            let optBg = "bg-black/20 border-white/5";
                            let icon = null;
                            
                            if (isSelected && isActualCorrect) {
                              optBg = "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/30";
                              icon = <Check className="h-5 w-5 text-emerald-400" />;
                            } else if (isSelected && !isActualCorrect) {
                              optBg = "bg-red-500/10 border-red-500/30 ring-1 ring-red-500/30";
                              icon = <X className="h-5 w-5 text-red-400" />;
                            } else if (!isSelected && isActualCorrect) {
                              optBg = "bg-emerald-500/5 border-emerald-500/30 border-dashed";
                              icon = <Check className="h-5 w-5 text-emerald-400 opacity-50" />;
                            }

                            return (
                              <div key={opt.id} className={`p-4 rounded-xl border flex items-center justify-between ${optBg} transition-colors`}>
                                <div className="text-gray-200">{opt.value}</div>
                                {icon}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
