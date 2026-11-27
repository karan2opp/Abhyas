"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/display/card";
import { Button } from "@/components/ui/controls/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Bot, User, MessageSquare, PanelRightClose, PanelRightOpen } from "lucide-react";
import { getSubmissionByIdService, getExamForSubmissionService } from "@/app/student/student.service";
import { gradeExamSubmissionService, evaluateExamSubmissionWithAiService } from "../../../../../../exams/exam.service";
import { toast } from "sonner";
import { marksProblem } from "@/lib/marksValidation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { normalizeCodeBlocks } from "@/lib/markdown";
import { MATH_REMARK_PLUGINS, MATH_REHYPE_PLUGINS } from "@/lib/markdownMath";
import { ContentBlocksView, OptionValue, MarkdownCode } from "@/components/exam/QuestionContentBlocks";
import { ResultNavigator, OpenQuestionsButton } from "@/components/exam/ResultNavigator";
import { formatMarks } from "@/lib/formatMarks";


export default function ResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = params.submissionId as string;
  const classroomId = params.id as string;
  const examId = params.examId as string;
  const router = useRouter();
  const returnTo = searchParams.get("returnTo");

  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Wide screens: the questions bar can be collapsed. Phones: it is a sidebar that is opened from the top bar.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");

  const [marksByAnswer, setMarksByAnswer] = useState<Record<string, string>>({});
  const [feedbackByAnswer, setFeedbackByAnswer] = useState<Record<string, string>>({});
  const [overallFeedbackInput, setOverallFeedbackInput] = useState("");
  const [showQuestionFeedback, setShowQuestionFeedback] = useState(false);
  const [showOverallFeedback, setShowOverallFeedback] = useState(false);
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
          router.replace(`/teacher/classrooms/${classroomId}/exams/${examId}/results`);
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
      } catch {
        toast.error("Failed to load results.");
        router.push(`/teacher/classrooms/${classroomId}/exams/${examId}/results`);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
    
    let interval: NodeJS.Timeout;
    if (submission?.status === "evaluating") {
      interval = setInterval(() => {
        fetchResult();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [submissionId, router, submission?.status, selectedSectionId]);

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
    } catch {
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
      const section = (exam?.sections || []).find((s: any) => s.questions?.some((sq: any) => sq.id === a.questionId));
      const number = (section?.questions?.findIndex((sq: any) => sq.id === a.questionId) ?? 0) + 1;
      const label = (exam?.sections?.length ?? 0) > 1 ? `Q${number} in ${section?.title}` : `Q${number}`;
      const problem = marksProblem(label, marksByAnswer[a.id], q?.marks);
      if (problem) {
        toast.error(problem);
        // Take the teacher to the question that needs fixing.
        if (section) {
          setSelectedSectionId(section.id);
          setSelectedQuestionId(a.questionId);
        }
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

  if (loading) return <div className="p-4 sm:p-6 md:p-10 text-white text-center">Loading results...</div>;
  if (!submission || !exam) return <div className="p-4 sm:p-6 md:p-10 text-white text-center">Result not found.</div>;

  const score = submission.score ?? 0;
  const totalMarks = exam.totalMarks ?? 0;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  if (submission.status === "evaluating") {
    return (
      <div className="p-4 sm:p-6 md:p-10 h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-white tracking-wide">Evaluating...</h2>
      </div>
    );
  }

  let colorClass = "text-red-400";
  let bgClass = "bg-red-500/10";
  let borderClass = "border-red-500/20";
  let message = "Needs Improvement";
  
  if (percentage >= 80) {
    colorClass = "text-emerald-400";
    bgClass = "bg-emerald-500/10";
    borderClass = "border-emerald-500/20";
    message = "Excellent";
  } else if (percentage >= 50) {
    colorClass = "text-yellow-400";
    bgClass = "bg-yellow-500/10";
    borderClass = "border-yellow-500/20";
    message = "Good Effort";
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
  // AI grading only marks written answers (choice questions are marked automatically), so its button needs at least one.
  const hasWrittenQuestions = exam.sections?.some((s: any) => s.questions?.some((q: any) => q.type === "descriptive"));
  const questionIndex = currentSection?.questions?.findIndex((q: any) => q.id === selectedQuestionId) ?? 0;

  // Previous / Next walk through every question of the exam in order, moving on to the next section when one ends.
  const orderedQuestions: { sectionId: string; questionId: string }[] = (exam.sections || []).flatMap((s: any) =>
    (s.questions || []).map((q: any) => ({ sectionId: s.id as string, questionId: q.id as string }))
  );
  const currentIndex = orderedQuestions.findIndex((entry) => entry.questionId === selectedQuestionId);
  const goToOffset = (offset: number) => {
    const target = orderedQuestions[currentIndex + offset];
    if (!target) return;
    setSelectedSectionId(target.sectionId);
    setSelectedQuestionId(target.questionId);
  };

  const renderNavigationSidebar = () => (
      <Card className="bg-[#0f0f11] border-white/5 flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl">
        <CardHeader className="pb-3 border-b border-white/5 shrink-0 px-5 pt-4">
          <CardTitle className="text-base font-bold text-white flex items-center justify-between">
            <span>Questions Bar</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-normal">{totalQuestions} Total</span>
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse Questions Bar"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close questions bar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {exam.sections?.length > 1 && (
            <div className="mb-4 flex flex-col gap-1.5">
              {exam.sections.map((section: any) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    if (section.questions?.length > 0) {
                      setSelectedQuestionId(section.questions[0].id);
                    }
                  }}
                  className={`text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedSectionId === section.id
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium"
                      : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-5 gap-2">
            {currentSection?.questions?.map((q: any, idx: number) => {
              const ans = submission.answers?.find((a: any) => a.questionId === q.id);
              let btnClass = "bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20";
              
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
                btnClass += " ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0f0f11]";
              }
              
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedQuestionId(q.id);
                    setIsDrawerOpen(false);
                  }}
                  className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs border transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 space-y-2 text-[11px] text-gray-400">
            {!isCurrentSectionDescriptive && (
              <>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div> Correct</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40"></div> Incorrect</div>
              </>
            )}
            {isCurrentSectionDescriptive && (
              <>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div> Full marks</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div> Partial marks</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40"></div> Zero marks</div>
              </>
            )}
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-gray-500/20 border border-gray-500/40"></div> Skipped</div>
          </div>
        </CardContent>
      </Card>
  );

  return (
    <div className="p-3 sm:p-4 h-full flex-1 flex flex-col bg-[#050505] overflow-y-auto md:overflow-hidden">
      <div className="w-full flex flex-col min-h-full md:h-full md:overflow-hidden gap-3">
        
        {/* TOP BAR */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 pb-3 border-b border-white/5 shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={returnTo || `/teacher/classrooms/${classroomId}/exams/${examId}/results`} className="inline-flex items-center text-gray-400 hover:text-white transition-colors text-xs font-semibold">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Link>
            <span className="text-gray-700">|</span>
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[60vw] sm:max-w-md">{exam.title}</h1>
          </div>

          {/* Phones: a tidy two-by-two grid, every item the same height (Student | Marks, then Status | Questions). From sm up, one row. */}
          <div className="grid grid-cols-2 gap-2 w-full min-w-0 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
            <div className="flex h-8 min-w-0 items-center justify-center gap-1.5 sm:gap-2 bg-[#0f0f11] px-2.5 sm:px-3 sm:h-auto sm:py-1.5 rounded-xl border border-white/10 text-xs">
              <span className="text-gray-400 shrink-0">Student:</span>
              <span className="text-white font-semibold truncate">{submission.user?.name || "Student"}</span>
            </div>
            <div className={`flex h-8 items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap px-2.5 sm:px-3 sm:h-auto sm:py-1.5 rounded-xl border ${borderClass} ${bgClass} text-xs font-bold`}>
              <span className="text-gray-400 font-normal">Marks:</span>
              <span className={colorClass}>{formatMarks(score)} / {totalMarks} ({percentage}%)</span>
            </div>
            <span className="flex h-8 items-center justify-center text-[11px] sm:text-xs px-2 sm:px-2.5 sm:h-auto sm:py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
              {submission.status}
            </span>

            <OpenQuestionsButton onClick={() => setIsDrawerOpen(true)} />

            {/* Questions Bar Toggle (wide screens) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="bg-[#0f0f11] hover:bg-white/5 text-gray-300 hover:text-white border-white/10 text-xs h-8 px-3 rounded-xl hidden md:flex items-center gap-1.5 md:ml-2"
              title={isSidebarOpen ? "Collapse Questions Bar" : "Open Questions Bar"}
            >
              {isSidebarOpen ? (
                <>
                  <PanelRightClose className="h-3.5 w-3.5 text-orange-400" />
                  <span>Hide Questions Bar</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-3.5 w-3.5 text-orange-400" />
                  <span>Open Questions Bar</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 md:min-h-0 h-full">
          
          {/* LEFT SIDE */}
          <div className={`${isSidebarOpen ? "md:col-span-3" : "md:col-span-4"} flex flex-col flex-1 md:h-full md:min-h-0 min-w-0 transition-all duration-300`}>
            {selectedQuestion && (
              <Card className="bg-[#0f0f11] border-white/5 shadow-2xl flex-1 flex flex-col rounded-2xl md:h-full md:min-h-0 md:overflow-hidden">
                
                {/* Question Header */}
                <CardHeader className="border-b border-white/5 pb-3 p-4 shrink-0 bg-white/[0.01]">
                  {/* Phones: the marks box is last in the markup, so flex-col-reverse puts it first. From sm up it is on the right. */}
                  <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-between sm:items-start sm:gap-4">
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${selectedQuestion.type === 'mcq' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {selectedQuestion.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-medium text-white leading-relaxed prose prose-invert max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={MATH_REMARK_PLUGINS}
                          rehypePlugins={MATH_REHYPE_PLUGINS}
                          components={{
                            pre: ({ children }) => {
                              return (
                                <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-[#09090b] keep-dark">
                                  <div className="p-4 overflow-x-auto custom-scrollbar font-normal">
                                    {children}
                                  </div>
                                </div>
                              );
                            },
                            code: ({ className, children }) => <MarkdownCode className={className} size="compact">{children}</MarkdownCode>,
                            p: ({...props}) => <p className="mb-1 last:mb-0 inline-block" {...props} />
                          }}
                        >
                          {normalizeCodeBlocks(`**Q${questionIndex + 1}.** ${selectedQuestion.description}`)}
                        </ReactMarkdown>
                        <ContentBlocksView blocks={selectedQuestion.contentBlocks} size="compact" />
                      </div>
                    </div>

                    {/* Marks Awarded Input */}
                    <div className="flex flex-col items-start sm:items-end gap-1.5 sm:shrink-0">
                      <div className="flex items-center gap-2 bg-[#0d111a] px-3 py-1.5 rounded-xl border border-white/10">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={selectedQuestion.marks}
                          value={selectedAnswer ? (marksByAnswer[selectedAnswer.id] ?? "") : ""}
                          onChange={(e) => selectedAnswer && setMarksByAnswer((prev) => ({ ...prev, [selectedAnswer.id]: e.target.value }))}
                          className="w-16 text-white py-1 text-sm font-bold text-center rounded-none border-0 border-b border-white/20 bg-transparent px-0 transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-0"
                        />
                        <span className="text-xs font-semibold text-gray-400 pr-1">/ {selectedQuestion.marks} Marks</span>
                      </div>
                      {selectedAnswer?.evaluatedBy && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selectedAnswer.evaluatedBy === "teacher" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/30"}`}>
                          {selectedAnswer.evaluatedBy === "teacher" ? <User className="h-3 w-3" /> : selectedQuestion?.type === "mcq" ? null : <Bot className="h-3 w-3" />}
                          {selectedAnswer.evaluatedBy === "teacher" ? "Graded by you" : selectedQuestion?.type === "mcq" ? "Marked automatically" : "Graded by AI"}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Answer Content */}
                <CardContent className="p-4 sm:p-5 flex-1 flex flex-col space-y-3 md:overflow-y-auto custom-scrollbar md:min-h-0">
                  {isDescriptive ? (
                    <div className="flex-1 flex flex-col space-y-2 min-h-0 h-full">
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Student's Answer:</div>
                      <div className="flex-1 p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0d111a] border border-white/10 text-gray-100 whitespace-pre-wrap break-words font-mono text-sm sm:text-base leading-relaxed overflow-y-auto custom-scrollbar shadow-inner min-h-[55dvh] sm:min-h-[350px]">
                        {selectedAnswer?.textAnswer || <span className="text-gray-500 italic">No answer provided.</span>}
                      </div>

                      {/* Two Small Feedback Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`text-xs border-white/10 h-8 px-3 rounded-lg flex items-center gap-1.5 transition-all ${
                            showQuestionFeedback || feedbackByAnswer[selectedAnswer?.id]
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                              : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                          }`}
                          onClick={() => setShowQuestionFeedback(!showQuestionFeedback)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {showQuestionFeedback || feedbackByAnswer[selectedAnswer?.id] ? "Question Feedback" : "+ Question Feedback"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`text-xs border-white/10 h-8 px-3 rounded-lg flex items-center gap-1.5 transition-all ${
                            showOverallFeedback || overallFeedbackInput
                              ? "bg-orange-500/20 text-orange-300 border-indigo-500/40"
                              : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                          }`}
                          onClick={() => setShowOverallFeedback(!showOverallFeedback)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {showOverallFeedback || overallFeedbackInput ? "Overall Feedback" : "+ Overall Feedback"}
                        </Button>
                      </div>

                      {/* Question Feedback Textarea */}
                      {(showQuestionFeedback || feedbackByAnswer[selectedAnswer?.id]) && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                          <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider flex justify-between">
                            <span>Question Feedback:</span>
                            <button type="button" onClick={() => setShowQuestionFeedback(false)} className="text-[11px] text-gray-500 hover:text-gray-300 lowercase font-normal">Close</button>
                          </div>
                          <textarea
                            value={selectedAnswer ? (feedbackByAnswer[selectedAnswer.id] ?? "") : ""}
                            onChange={(e) => selectedAnswer && setFeedbackByAnswer((prev) => ({ ...prev, [selectedAnswer.id]: e.target.value }))}
                            rows={5}
                            placeholder="Feedback for this question answer..."
                            className="w-full bg-[#0d111a] text-gray-100 border border-white/10 rounded-xl px-4 py-2.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm resize-y min-h-28 font-sans"
                          />
                        </div>
                      )}

                      {/* Overall Feedback Textarea */}
                      {(showOverallFeedback || overallFeedbackInput) && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                          <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider flex justify-between">
                            <span>Overall Exam Feedback:</span>
                            <button type="button" onClick={() => setShowOverallFeedback(false)} className="text-[11px] text-gray-500 hover:text-gray-300 lowercase font-normal">Close</button>
                          </div>
                          <textarea
                            value={overallFeedbackInput}
                            onChange={(e) => setOverallFeedbackInput(e.target.value)}
                            rows={5}
                            placeholder="Overall comments for the student..."
                            className="w-full bg-[#0d111a] text-gray-100 border border-white/10 rounded-xl px-4 py-2.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm resize-y min-h-28 font-sans"
                          />
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
                            <div className="text-gray-200"><OptionValue value={opt.value} isCode={opt.isCode} size="compact" /></div>
                            {icon}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>

                {/* Actions Bar: outside the scrolling answer area, so a long answer scrolls inside the card and never runs under the buttons. */}
                <div className="shrink-0 border-t border-white/5 p-4 sm:px-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        className="bg-transparent border-white/10 text-white hover:bg-white/5 text-xs h-9 px-3"
                        onClick={() => goToOffset(-1)}
                        disabled={currentIndex <= 0}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                      </Button>
                      <span className="text-[11px] text-gray-500 tabular-nums">
                        {currentIndex + 1} / {orderedQuestions.length}
                      </span>
                      <Button
                        variant="outline"
                        className="bg-transparent border-white/10 text-white hover:bg-white/5 text-xs h-9 px-3"
                        onClick={() => goToOffset(1)}
                        disabled={currentIndex < 0 || currentIndex >= orderedQuestions.length - 1}
                      >
                        Next <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 hidden sm:block">
                      Saving locks manual grades from AI overwrites.
                    </p>
                    {/* On phones the two buttons share the row equally (Save Grade fills it when there is no Evaluate button). */}
                    <div className="flex w-full items-center gap-2 sm:w-auto sm:ml-auto">
                      {exam?.aiEvaluation !== false && hasWrittenQuestions && (
                        <Button
                          variant="outline"
                          className="flex-1 sm:flex-none bg-transparent border-white/10 text-white hover:bg-white/5 text-xs h-9 px-3"
                          onClick={handleEvaluateWithAi}
                          disabled={evaluatingAi || savingGrade}
                          title="Re-runs AI evaluation for every written answer in this submission that you haven't graded yourself"
                        >
                          <Bot className="mr-1.5 h-3.5 w-3.5 text-orange-400" />
                          {evaluatingAi ? "Evaluating..." : "Evaluate with AI"}
                        </Button>
                      )}
                      <Button
                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-5 shadow-lg shadow-emerald-900/30"
                        onClick={handleSaveGrade}
                        disabled={savingGrade || evaluatingAi}
                      >
                        {savingGrade ? "Saving..." : "Save Grade"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT SIDE: a sidebar on phones, the questions column from md up */}
          <ResultNavigator open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} desktopVisible={isSidebarOpen}>
            {renderNavigationSidebar()}
          </ResultNavigator>
        </div>
      </div>
    </div>
  );
}
