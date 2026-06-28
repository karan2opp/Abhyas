"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trophy, ArrowLeft, Clock, Calendar, Check, X, Bot } from "lucide-react";
import { getSubmissionByIdService, getExamForSubmissionService } from "../../student.service";
import { toast } from "sonner";
import Link from "next/link";

export default function ResultsPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");

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
        
        if (examData?.sections?.length > 0 && !selectedSectionId) {
          const firstSection = examData.sections[0];
          setSelectedSectionId(firstSection.id);
          if (firstSection.questions?.length > 0) {
            setSelectedQuestionId(firstSection.questions[0].id);
          }
        }
      } catch (err) {
        toast.error("Failed to load results.");
        router.push("/student");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
    
    let interval: NodeJS.Timeout;
    if (submission?.status === "evaluating") {
      interval = setInterval(() => {
        fetchResult();
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [submissionId, router, submission?.status, selectedSectionId]);

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

  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;
  let totalQuestions = 0;
  
  exam.sections?.forEach((s: any) => {
    s.questions?.forEach((q: any) => {
      totalQuestions++;
      const ans = submission.answers?.find((a: any) => a.questionId === q.id);
      if (!ans) {
        skippedCount++;
      } else {
        if (q.type !== 'descriptive') {
          if (ans.isCorrect === true) correctCount++;
          else incorrectCount++;
        }
      }
    });
  });

  const currentSection = exam.sections?.find((s: any) => s.id === selectedSectionId);
  const isCurrentSectionDescriptive = currentSection?.questions?.some((q: any) => q.type === "descriptive");
  const selectedQuestion = currentSection?.questions?.find((q: any) => q.id === selectedQuestionId);
  const selectedAnswer = submission.answers?.find((a: any) => a.questionId === selectedQuestionId);
  const isDescriptive = selectedQuestion?.type === "descriptive";
  const questionIndex = currentSection?.questions?.findIndex((q: any) => q.id === selectedQuestionId) ?? 0;

  const renderNavigationSidebar = (containerClass: string) => (
    <div className={containerClass}>
      <Card className="bg-[#111520] border-white/5 md:h-full flex flex-col md:max-h-full md:overflow-hidden">
        <CardHeader className="pb-4 border-b border-white/5 shrink-0">
          <CardTitle className="text-lg text-white">Questions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 md:overflow-y-auto custom-scrollbar">
          
          {/* Section Selector */}
          {exam.sections?.length > 1 && (
            <div className="mb-6 flex flex-col gap-2">
              {exam.sections.map((section: any) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    if (section.questions?.length > 0) {
                      setSelectedQuestionId(section.questions[0].id);
                    }
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSectionId === section.id
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium"
                      : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}
          
          {/* Question Grid */}
          <div className="flex flex-wrap gap-2">
            {currentSection?.questions?.map((q: any, idx: number) => {
              const ans = submission.answers?.find((a: any) => a.questionId === q.id);
              let btnClass = "bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20"; // skipped / default
              
              if (ans) {
                if (q.type === 'descriptive') {
                  if (ans.marksAwarded >= q.marks) {
                    btnClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20";
                  } else if (ans.marksAwarded > 0) {
                    btnClass = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20";
                  } else {
                    btnClass = "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20";
                  }
                } else {
                  if (ans.isCorrect === true) {
                    btnClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20";
                  } else {
                    btnClass = "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20";
                  }
                }
              }

              const isSelected = selectedQuestionId === q.id;
              if (isSelected) {
                btnClass += " ring-2 ring-blue-500 ring-offset-2 ring-offset-[#111520]";
              }
              
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm border transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-4 border-t border-white/5 space-y-3 text-xs text-gray-400">
            {!isCurrentSectionDescriptive && (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div> Correct</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40"></div> Incorrect</div>
              </>
            )}
            {isCurrentSectionDescriptive && (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div> Full marks</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div> Partial marks</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40"></div> Zero marks</div>
              </>
            )}
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-500/20 border border-gray-500/40"></div> Skipped</div>
          </div>

        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 h-full flex-1 flex flex-col bg-[#0A0D14] overflow-y-auto md:overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col min-h-full md:h-full md:overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/student" className="inline-flex items-center text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <Link href={`/student/exams/${exam?.id}/leaderboard`}>
              <Button 
                size="sm" 
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold ml-2"
              >
                <Trophy className="mr-2 h-4 w-4" /> View Leaderboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(submission.submittedAt || submission.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-emerald-400 capitalize">{submission.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 md:min-h-0">
          {/* Left Column - Main Content */}
          <div className="md:col-span-3 flex flex-col gap-6 md:overflow-y-auto custom-scrollbar pr-2 pb-6 min-w-0">
            
            {/* Compact Result Summary */}
            <Card className="bg-[#111520] border-white/5 shadow-2xl relative shrink-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              <CardContent className="p-6">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
                  {/* Score Info */}
                  <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className={`shrink-0 relative flex items-center justify-center w-16 h-16 rounded-full border-[3px] ${borderClass} ${bgClass}`}>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${colorClass}`}>{percentage}%</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate" title={exam.title}>{exam.title}</h2>
                      <div className={`text-sm font-medium ${colorClass}`}>{message}</div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="flex flex-wrap gap-2 w-full xl:w-auto shrink-0 justify-start">
                    <div className="bg-black/20 rounded-lg p-2 flex flex-col items-center justify-center border border-white/5 flex-1 min-w-[70px] sm:min-w-[80px]">
                      <div className="text-lg font-bold text-white flex items-baseline gap-0.5">
                        {score}<span className="text-[10px] text-gray-500">/{totalMarks}</span>
                      </div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5 text-center">Marks</div>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-2 flex flex-col items-center justify-center border border-blue-500/20 flex-1 min-w-[70px] sm:min-w-[80px]">
                      <div className="text-lg font-bold text-blue-400">{totalQuestions}</div>
                      <div className="text-[9px] text-blue-500/70 uppercase tracking-wider font-semibold mt-0.5 text-center">Total Qs</div>
                    </div>
                    {!isCurrentSectionDescriptive && (
                      <>
                        <div className="bg-emerald-500/10 rounded-lg p-2 flex flex-col items-center justify-center border border-emerald-500/20 flex-1 min-w-[70px] sm:min-w-[80px]">
                          <div className="text-lg font-bold text-emerald-400">{correctCount}</div>
                          <div className="text-[9px] text-emerald-500/70 uppercase tracking-wider font-semibold mt-0.5 text-center">Correct</div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-2 flex flex-col items-center justify-center border border-red-500/20 flex-1 min-w-[70px] sm:min-w-[80px]">
                          <div className="text-lg font-bold text-red-400">{incorrectCount}</div>
                          <div className="text-[9px] text-red-500/70 uppercase tracking-wider font-semibold mt-0.5 text-center">Incorrect</div>
                        </div>
                      </>
                    )}
                    <div className="bg-gray-500/10 rounded-lg p-2 flex flex-col items-center justify-center border border-gray-500/20 flex-1 min-w-[70px] sm:min-w-[80px]">
                      <div className="text-lg font-bold text-gray-300">{skippedCount}</div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5 text-center">Skipped</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Navigation Sidebar */}
            {renderNavigationSidebar("md:hidden flex flex-col gap-4")}

            {/* Selected Question Detail */}
            {selectedQuestion && (
              <Card className="bg-[#111520]/80 border-white/5 shadow-xl backdrop-blur-xl shrink-0">
                <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.02]">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-medium text-white leading-relaxed">
                      <span className="text-gray-500 mr-2">Q{questionIndex + 1}.</span> 
                      {selectedQuestion.description}
                    </CardTitle>
                    <div className="flex flex-col items-end shrink-0">
                      <div className={`text-sm font-bold px-3 py-1 rounded-full border ${
                        isDescriptive 
                          ? (selectedAnswer?.marksAwarded >= selectedQuestion.marks ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : selectedAnswer?.marksAwarded > 0 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')
                          : (selectedAnswer?.isCorrect ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')
                      }`}>
                        {selectedAnswer?.marksAwarded ?? 0} / {selectedQuestion.marks} Marks
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {isDescriptive ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-2 font-medium">Your Answer:</div>
                        <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-gray-300 whitespace-pre-wrap font-mono text-sm max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar">
                          {selectedAnswer?.textAnswer || <span className="text-gray-600 italic">No answer provided.</span>}
                        </div>
                      </div>
                      
                      {selectedAnswer?.feedback && (
                        <div className="mt-6 p-5 rounded-xl bg-blue-900/10 border border-blue-500/20 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                          <div className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-2 rounded-lg shrink-0">
                              <Bot className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-blue-400 mb-1 font-semibold tracking-wide uppercase">AI Evaluation</div>
                              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar pr-2">{selectedAnswer.feedback}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedQuestion.options?.map((opt: any) => {
                        const isSelected = selectedAnswer?.options?.includes(opt.id);
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
            )}
          </div>

          {/* Right Column - Navigation Sidebar (Desktop) */}
          {renderNavigationSidebar("hidden md:flex md:col-span-1 flex-col gap-4")}
        </div>
      </div>
    </div>
  );
}

