"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, Send, Shield, Flag, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getExamForSubmissionService, getSubmissionByIdService, submitAnswerService, submitExamService } from "../../student.service";
import { FeedbackModal } from "@/components/FeedbackModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Define a type for our flattened question structure
type FlattenedQuestion = {
  id: string;
  globalIndex: number;
  sectionTitle: string;
  description: string;
  marks: number;
  type: string;
  options: any[];
  images: any[];
};

export default function ExamAttemptPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const router = useRouter();

  const [examData, setExamData] = useState<any>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Map of questionId -> selectedOptionIds[]
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string[]>>({});
  const [savedTextAnswers, setSavedTextAnswers] = useState<Record<string, string>>({});
  
  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(0);

  // Feedback State
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    
    const fetchData = async () => {
      try {
        const [examRes, subRes] = await Promise.all([
          getExamForSubmissionService(submissionId),
          getSubmissionByIdService(submissionId)
        ]);
        
        const exam = examRes.data || examRes;
        const sub = subRes.data || subRes;
        
        if (sub.status !== "inprogress") {
          toast.info("This exam is already submitted or timeout.");
          router.replace(`/student/results/${submissionId}`);
          return;
        }

        setExamData(exam);
        setSubmissionData(sub);

        // Populate initial answers
        const initialAnswers: Record<string, string[]> = {};
        const initialTextAnswers: Record<string, string> = {};
        if (sub.answers && Array.isArray(sub.answers)) {
          sub.answers.forEach((ans: any) => {
            if (ans.options) initialAnswers[ans.questionId] = ans.options;
            if (ans.textAnswer) initialTextAnswers[ans.questionId] = ans.textAnswer;
          });
        }
        setAnswers(initialAnswers);
        setSavedAnswers(initialAnswers);
        setTextAnswers(initialTextAnswers);
        setSavedTextAnswers(initialTextAnswers);

        // Setup timer based on submission createdAt
        if (sub.createdAt && exam.duration) {
          const startTime = new Date(sub.createdAt).getTime();
          const durationMs = exam.duration * 60 * 1000;
          const endTime = startTime + durationMs;
          const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
          setTimeLeft(remaining);
        }

      } catch (err) {
        toast.error("Failed to load the assessment.");
        router.push("/student");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [submissionId, router]);

  // Flatten sections into a linear array of questions
  const flattenedQuestions = useMemo<FlattenedQuestion[]>(() => {
    if (!examData || !examData.sections) return [];
    
    let globalIndex = 0;
    const result: FlattenedQuestion[] = [];
    
    examData.sections.forEach((section: any) => {
      if (section.questions) {
        section.questions.forEach((q: any) => {
          result.push({
            id: q.id,
            globalIndex,
            sectionTitle: section.title,
            description: q.description,
            marks: q.marks,
            type: q.type,
            options: q.options || [],
            images: q.images || [],
          });
          globalIndex++;
        });
      }
    });
    
    return result;
  }, [examData]);

  const handleTimeUp = async () => {
    toast.error("Time is up! Submitting your assessment automatically.");
    await submitExamFinal();
  };

  const handleOptionChange = (questionId: string, optionId: string) => {
    const newSelected = [optionId]; 
    setAnswers(prev => ({
      ...prev,
      [questionId]: newSelected
    }));
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    setTextAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };


  // Button Handlers
  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNextSkip = () => {
    if (currentIndex < flattenedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSaveAction = async (moveToNext: boolean) => {
    const currentQ = flattenedQuestions[currentIndex];
    const selectedOptions = answers[currentQ.id];
    const textAns = textAnswers[currentQ.id];

    if (currentQ.type === "mcq" && (!selectedOptions || selectedOptions.length === 0)) {
      toast.error("Please select an answer to save, or use 'Next' to skip.");
      return;
    }
    
    if (currentQ.type !== "mcq" && (!textAns || textAns.trim() === "")) {
      toast.error("Please write your answer to save, or use 'Next' to skip.");
      return;
    }

    setIsSavingAnswer(true);
    try {
      await submitAnswerService({
        submissionId,
        questionId: currentQ.id,
        options: currentQ.type === "mcq" ? selectedOptions : undefined,
        textAnswer: currentQ.type !== "mcq" ? textAns : undefined
      });

      // Update saved answers state
      if (currentQ.type === "mcq") {
        setSavedAnswers(prev => ({ ...prev, [currentQ.id]: selectedOptions }));
      } else {
        setSavedTextAnswers(prev => ({ ...prev, [currentQ.id]: textAns }));
      }
      
      if (moveToNext) {
        if (currentIndex < flattenedQuestions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          toast.success("All questions answered! You can now submit the exam.");
        }
      } else {
        toast.success("Answer saved successfully.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save answer");
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const submitExamFinal = async () => {
    setIsSubmitting(true);
    try {
      const currentQ = flattenedQuestions[currentIndex];
      if (currentQ) {
        const selectedOptions = answers[currentQ.id];
        const textAns = textAnswers[currentQ.id];
        
        const hasMcqAns = currentQ.type === "mcq" && selectedOptions && selectedOptions.length > 0;
        const hasTextAns = currentQ.type !== "mcq" && textAns && textAns.trim() !== "";
        
        if (hasMcqAns || hasTextAns) {
          try {
             await submitAnswerService({
              submissionId,
              questionId: currentQ.id,
              options: currentQ.type === "mcq" ? selectedOptions : undefined,
              textAnswer: currentQ.type !== "mcq" ? textAns : undefined
            });
          } catch(e) {
            console.error("Failed to save final answer before submission", e);
          }
        }
      }

      await submitExamService(submissionId);
      toast.success("Assessment submitted successfully!");
      if (examData?.requireFeedback) {
        setShowFeedback(true);
      } else {
        router.push(`/student/results/${submissionId}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit exam");
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (!confirm("Are you sure you want to submit your assessment? You cannot change your answers after submitting.")) return;
    submitExamFinal();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const ExamTimer = ({ endTime, onTimeUp }: { endTime: number, onTimeUp: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

    useEffect(() => {
      if (timeLeft <= 0) {
        onTimeUp();
        return;
      }

      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);

      return () => clearInterval(timer);
    }, [timeLeft]);

    return (
      <div className={`font-mono text-2xl font-bold tracking-wider ${timeLeft < 300 ? 'text-red-400' : 'text-gray-200'}`}>
        {formatTime(timeLeft)}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full bg-[#0b0f19] text-white">Loading Assessment...</div>;
  if (!examData) return <div className="flex items-center justify-center h-full bg-[#0b0f19] text-white">Assessment not found.</div>;
  if (flattenedQuestions.length === 0) return <div className="flex items-center justify-center h-full bg-[#0b0f19] text-white">No questions in this assessment.</div>;

  const currentQuestion = flattenedQuestions[currentIndex];
  const selectedOptions = answers[currentQuestion.id] || [];
  const textAnswer = textAnswers[currentQuestion.id] || "";

  return (
    <div className="flex flex-col h-full bg-[#0b0f19]">
      {/* Top Header */}
      <header className="shrink-0 bg-[#111520] border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{examData.title}</h1>
        </div>
        
        {/* Timer in Center */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Time Remaining</span>
          {submissionData?.createdAt && examData?.duration ? (
            <ExamTimer 
              endTime={new Date(submissionData.createdAt).getTime() + examData.duration * 60 * 1000} 
              onTimeUp={handleTimeUp} 
            />
          ) : (
            <div className="font-mono text-2xl font-bold tracking-wider text-gray-200">--:--</div>
          )}
        </div>

        <Button 
          onClick={handleSubmitClick} 
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-lg shadow-indigo-900/20"
        >
          {isSubmitting ? "Submitting..." : "Submit Exam"}
        </Button>
      </header>

      {/* Main Split Content */}
      <div className="flex flex-1 min-h-0">
        
        {/* Left Pane: Question Area */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* Question Header */}
          <div className="px-8 py-6 pb-2 border-b border-white/5">
            <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
              {currentQuestion.sectionTitle}
            </p>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 tracking-wide">
                QUESTION {currentIndex + 1} OF {flattenedQuestions.length}
              </h2>
              <span className="text-xs font-semibold text-gray-500 bg-white/5 px-2 py-1 rounded">
                {currentQuestion.marks} Marks
              </span>
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 px-8 py-8 space-y-8 max-w-4xl">
            <div>
              <div className="text-xl md:text-2xl font-bold text-white leading-snug whitespace-pre-wrap prose prose-invert max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({node, ...props}) => {
                      const isInline = !props.className?.includes('language-');
                      return isInline 
                        ? <code className="bg-purple-500/10 px-2 py-1 rounded text-lg text-purple-300 font-mono border border-purple-500/20 font-normal" {...props} /> 
                        : (
                          <div className="my-6 rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-2xl font-normal">
                            <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center gap-2">
                              <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]" />
                              <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
                              <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]" />
                              <span className="ml-3 text-sm font-mono text-gray-500 tracking-wider uppercase">{props.className?.replace('language-', '') || 'code'}</span>
                            </div>
                            <div className="p-6 overflow-x-auto custom-scrollbar">
                              <code className="block font-mono text-[16px] md:text-lg leading-relaxed text-gray-300" {...props} />
                            </div>
                          </div>
                        )
                    },
                    p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />
                  }}
                >
                  {currentQuestion.description || "No question text provided."}
                </ReactMarkdown>
              </div>
              {currentQuestion.images && currentQuestion.images.length > 0 && (
                <div className="mt-6 mb-2">
                  <img src={currentQuestion.images[0].url} alt="Question figure" className="max-h-64 object-contain rounded-lg border border-white/10 bg-black/50" />
                </div>
              )}
            </div>

            {currentQuestion.type !== "mcq" ? (
              <div className="space-y-4">
                <textarea
                  value={textAnswer}
                  onChange={(e) => handleTextAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Type your descriptive answer here..."
                  className="w-full min-h-[400px] bg-[#111520] text-white border border-white/10 rounded-xl p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {currentQuestion.options?.map((opt: any, idx: number) => {
                  const isSelected = selectedOptions.includes(opt.id);
                // Map index 0->A, 1->B, etc.
                const letter = String.fromCharCode(65 + idx);
                
                return (
                  <label 
                    key={opt.id} 
                    className={`
                      relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 group
                      ${isSelected 
                        ? "bg-indigo-500/10 border-indigo-500/50 text-white" 
                        : "bg-transparent border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5"}
                    `}
                  >
                    <input 
                      type="radio" 
                      name={`question-${currentQuestion.id}`} 
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => handleOptionChange(currentQuestion.id, opt.id)}
                    />
                    
                    {/* Letter Avatar */}
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-md border mr-4 shrink-0 transition-colors font-bold text-sm
                      ${isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-600 text-gray-400 group-hover:border-gray-400"}
                    `}>
                      {letter}
                    </div>
                    
                    <span className="text-[15px] leading-relaxed flex-1">{opt.value}</span>
                  </label>
                );
              })}
            </div>
            )}
          </div>

          {/* Question Footer Actions */}
          <div className="shrink-0 p-6 px-8 border-t border-white/5 bg-[#111520]/50 flex items-center justify-end">
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleNextSkip}
                disabled={currentIndex === flattenedQuestions.length - 1}
                className="bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
              >
                Next (Skip) <ChevronRight className="ml-2 h-4 w-4" />
              </Button>

              <Button 
                variant="outline"
                onClick={() => handleSaveAction(false)}
                disabled={isSavingAnswer || (currentQuestion.type === "mcq" ? selectedOptions.length === 0 : (!textAnswer || textAnswer.trim() === ""))}
                className="bg-emerald-600/10 border-emerald-500/50 hover:bg-emerald-600 hover:text-white text-emerald-400 font-semibold min-w-[100px]"
              >
                {isSavingAnswer ? "Saving..." : "Save"}
              </Button>

              <Button 
                onClick={() => handleSaveAction(true)}
                disabled={isSavingAnswer || currentIndex === flattenedQuestions.length - 1 || (currentQuestion.type === "mcq" ? selectedOptions.length === 0 : (!textAnswer || textAnswer.trim() === ""))}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold min-w-[140px]"
              >
                Save & Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right Pane: Navigator */}
        <aside className="w-56 md:w-64 lg:w-80 border-l border-white/5 bg-[#111520] shrink-0 flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Navigator</h3>
            {/* Compute answered count based on local state */}
            <span className="text-xs font-semibold text-gray-400 bg-black/20 px-2 py-1 rounded">
              {Object.keys(savedAnswers).filter(k => savedAnswers[k].length > 0).length} / {flattenedQuestions.length} Answered
            </span>
          </div>

          {/* Section Tabs */}
          {examData.sections && examData.sections.length > 0 && (
            <div className="px-6 py-3 border-b border-white/5 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
              {examData.sections.map((sec: any) => {
                const isActive = currentQuestion.sectionTitle === sec.title;
                return (
                  <button
                    key={sec.title}
                    onClick={() => {
                      const firstQIndex = flattenedQuestions.findIndex(q => q.sectionTitle === sec.title);
                      if (firstQIndex !== -1) setCurrentIndex(firstQIndex);
                    }}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap
                      ${isActive 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}
                    `}
                  >
                    {sec.title}
                  </button>
                );
              })}
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-5 gap-2">
              {flattenedQuestions
                .filter((q) => q.sectionTitle === currentQuestion.sectionTitle)
                .map((q) => {
                const idx = q.globalIndex;
                const isCurrent = idx === currentIndex;
                const isAnswered = q.type === "mcq" 
                  ? (savedAnswers[q.id] && savedAnswers[q.id].length > 0)
                  : (savedTextAnswers[q.id] && savedTextAnswers[q.id].trim() !== "");
                let bgColor = "bg-transparent";
                let borderColor = "border-white/10";
                let textColor = "text-gray-400";

                if (isCurrent) {
                  borderColor = "border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-[#111520]";
                  textColor = "text-white";
                }
                
                if (isAnswered) {
                  bgColor = "bg-emerald-600";
                  borderColor = isCurrent ? "border-emerald-400 ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#111520]" : "border-emerald-500";
                  textColor = "text-white";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`
                      aspect-square rounded flex items-center justify-center text-sm font-semibold border transition-all
                      hover:border-gray-400
                      ${bgColor} ${borderColor} ${textColor}
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigator Legend & Integrity Banner */}
          <div className="shrink-0 p-6 border-t border-white/5 bg-[#0b0f19]/50">
            <div className="grid grid-cols-2 gap-y-3 mb-6">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div> Answered
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-3 h-3 border border-white/20 rounded-sm"></div> Unanswered
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-3 h-3 border border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0b0f19] rounded-sm"></div> Current
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
              <Shield className="h-5 w-5 text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-200">Exam Integrity Active</p>
                <p className="text-[11px] text-blue-300/70 leading-tight mt-1">
                  Activity is monitored. Stay on this screen.
                </p>
              </div>
            </div>
          </div>
        </aside>

      </div>

      {showFeedback && (
        <FeedbackModal
          examId={examData.id}
          submissionId={submissionId}
          hasTextQuestions={flattenedQuestions.some(q => q.type !== "mcq")}
          onClose={() => router.push(`/student/results/${submissionId}`)}
          onSuccess={() => router.push(`/student/results/${submissionId}`)}
        />
      )}
    </div>
  );
}
