"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trophy, ArrowLeft, Clock, Calendar, Check, X, Bot, User } from "lucide-react";
import { getSubmissionByIdService, getExamForSubmissionService } from "@/app/student/student.service";
import { gradeExamSubmissionService, evaluateExamSubmissionWithAiService } from "../../../exam.service";
import { toast } from "sonner";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDate } from "@/lib/date";

export default function ResultsPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const examId = params.id as string;
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");

  const [marksByAnswer, setMarksByAnswer] = useState<Record<string, string>>({});
  const [feedbackByAnswer, setFeedbackByAnswer] = useState<Record<string, string>>({});
  const [overallFeedbackInput, setOverallFeedbackInput] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [evaluatingAi, setEvaluatingAi] = useState(false);
  const gradingInitializedRef = useRef(false);

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
          toast.info("This exam is still in progress by the student.");
          router.replace(`/teacher/exams/${examId}/results`);
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
        router.push(`/teacher/exams/${examId}/results`);
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

  // Populate editable marks/feedback once the submission has actually finished
  // evaluating (the "evaluating" screen below short-circuits rendering until then).
  useEffect(() => {
    if (submission && submission.status !== "evaluating" && !gradingInitializedRef.current) {
      const marks: Record<string, string> = {};
      const feedback: Record<string, string> = {};
      (submission.answers || []).forEach((a: any) => {
        marks[a.id] = a.marksAwarded !== null && a.marksAwarded !== undefined ? String(a.marksAwarded) : "";
        feedback[a.id] = a.feedback || "";
      });
      setMarksByAnswer(marks);
      setFeedbackByAnswer(feedback);
      setOverallFeedbackInput(submission.overallFeedback || "");
      gradingInitializedRef.current = true;
    }
  }, [submission]);

  const refetchSubmission = async () => {
    try {
      const subRes = await getSubmissionByIdService(submissionId);
      gradingInitializedRef.current = false;
      setSubmission(subRes.data || subRes);
    } catch (err) {
      toast.error("Failed to refresh submission");
    }
  };

  const findQuestion = (questionId: string) => {
    for (const section of exam?.sections || []) {
      const q = section.questions?.find((q: any) => q.id === questionId);
      if (q) return q;
    }
    return null;
  };

  const handleSaveGrade = async () => {
    if (!submission) return;
    for (const a of submission.answers) {
      const q = findQuestion(a.questionId);
      const val = marksByAnswer[a.id];
      if (val === undefined || val === "" || isNaN(parseFloat(val))) {
        toast.error("Enter marks for every question before saving");
        return;
      }
      const parsed = parseFloat(val);
      if (parsed < 0 || (q && parsed > q.marks)) {
        toast.error(`Marks for "${q?.description?.slice(0, 40)}..." cannot exceed ${q?.marks}`);
        return;
      }
    }

    setSavingGrade(true);
    try {
      await gradeExamSubmissionService(submissionId, {
        answers: submission.answers.map((a: any) => ({
          answerId: a.id,
          marksAwarded: parseFloat(marksByAnswer[a.id]),
          feedback: feedbackByAnswer[a.id] || undefined,
        })),
        overallFeedback: overallFeedbackInput.trim() || undefined,
      });
      toast.success("Grade saved");
      await refetchSubmission();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save grade");
    } finally {
      setSavingGrade(false);
    }
  };

  const handleEvaluateWithAi = async () => {
    setEvaluatingAi(true);
    try {
      await evaluateExamSubmissionWithAiService(submissionId, { mode: "marks_and_feedback" });
      toast.success("AI evaluation complete");
      await refetchSubmission();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to run AI evaluation");
    } finally {
      setEvaluatingAi(false);
    }
  };

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
          <Link href={`/teacher/exams/${examId}/results`} className="inline-flex items-center text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Results
          </Link>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(submission.submittedAt || submission.updatedAt)}</span>
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
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-600"></div>
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
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${selectedQuestion.type === 'mcq' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {selectedQuestion.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}
                        </span>
                        <span className="border border-white/10 bg-white/5 px-2.5 py-1 rounded-md text-gray-300 text-[10px] font-bold">Marks: {selectedQuestion.marks || 1}</span>
                      </div>
                      <CardTitle className="text-lg font-medium text-white leading-relaxed prose prose-invert max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({node, ...props}) => {
                              const isInline = !props.className?.includes('language-');
                              return isInline 
                                ? <code className="bg-blue-500/10 px-1.5 py-0.5 rounded text-[13px] text-blue-300 font-mono border border-blue-500/20" {...props} /> 
                                : (
                                  <div className="my-5 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-2xl">
                                    <div className="bg-white/5 px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                      <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                                      <span className="ml-3 text-xs font-mono text-gray-500 tracking-wider uppercase">{props.className?.replace('language-', '') || 'code'}</span>
                                    </div>
                                    <div className="p-5 overflow-x-auto custom-scrollbar font-normal">
                                      <code className="block font-mono text-[13px] leading-relaxed text-gray-300" {...props} />
                                    </div>
                                  </div>
                                )
                            },
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 inline-block" {...props} />
                          }}
                        >
                          {`**Q${questionIndex + 1}.** ${selectedQuestion.description}`}
                        </ReactMarkdown>
                      </CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={selectedQuestion.marks}
                          value={selectedAnswer ? (marksByAnswer[selectedAnswer.id] ?? "") : ""}
                          onChange={(e) => selectedAnswer && setMarksByAnswer((prev) => ({ ...prev, [selectedAnswer.id]: e.target.value }))}
                          className="w-20 bg-[#09090b] border border-white/10 rounded-lg px-2 py-1 text-white text-sm font-bold text-right focus:outline-none focus:ring-1 focus:ring-white/30"
                        />
                        <span className="text-sm text-gray-400">/ {selectedQuestion.marks} Marks</span>
                      </div>
                      {selectedAnswer?.evaluatedBy && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selectedAnswer.evaluatedBy === "teacher" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                          {selectedAnswer.evaluatedBy === "teacher" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                          Graded by {selectedAnswer.evaluatedBy === "teacher" ? "you" : "AI"}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {isDescriptive ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-2 font-medium">Student's Answer:</div>
                        <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-gray-300 whitespace-pre-wrap font-mono text-sm max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar">
                          {selectedAnswer?.textAnswer || <span className="text-gray-600 italic">No answer provided.</span>}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400 mb-2 font-medium">Feedback for this answer</div>
                        <textarea
                          value={selectedAnswer ? (feedbackByAnswer[selectedAnswer.id] ?? "") : ""}
                          onChange={(e) => selectedAnswer && setFeedbackByAnswer((prev) => ({ ...prev, [selectedAnswer.id]: e.target.value }))}
                          rows={4}
                          placeholder="Feedback for this answer..."
                          className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
                        />
                      </div>
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

            {/* Grading Actions */}
            <Card className="bg-[#111520] border-white/5 shrink-0">
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-300">Overall Feedback</label>
                  <textarea
                    value={overallFeedbackInput}
                    onChange={(e) => setOverallFeedbackInput(e.target.value)}
                    rows={3}
                    placeholder="Overall comments for the student..."
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    className="bg-transparent border-white/10 text-white hover:bg-white/5"
                    onClick={handleEvaluateWithAi}
                    disabled={evaluatingAi || savingGrade}
                    title="Re-runs AI evaluation for any descriptive answer you haven't manually graded yet"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    {evaluatingAi ? "Evaluating..." : "Evaluate with AI"}
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSaveGrade}
                    disabled={savingGrade || evaluatingAi}
                  >
                    {savingGrade ? "Saving..." : "Save Grade"}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Saving a grade marks those answers as graded by you — AI evaluation will never overwrite them afterwards.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Navigation Sidebar (Desktop) */}
          {renderNavigationSidebar("hidden md:flex md:col-span-1 flex-col gap-4 md:min-h-0")}
        </div>
      </div>
    </div>
  );
}
