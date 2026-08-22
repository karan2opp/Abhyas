"use client";

import React, { useState, useEffect } from "react";
import { Bell, Settings, Image as ImageIcon, ChevronRight, UploadCloud, Lightbulb, Plus, X, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useParams, useSearchParams, useRouter } from "next/navigation";

import { getExamByIdService, updateExamService } from "../../../../exams/exam.service";
import { QuestionBuilder } from "../new/QuestionBuilder";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

export default function EditExamBuilder() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const examId = params.examId as string;
  const initialStep = searchParams.get("step") ? parseInt(searchParams.get("step") as string) : 1;
  
  const { step, setStep, examId: storeExamId, setExamId, isAddingSection, isAiMode, setIsAddingSection, setIsAiMode, resetStore } = useExamBuilderStore();
  const [isMounted, setIsMounted] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    setIsAddingSection(false);
    setIsAiMode(false);
    if (storeExamId !== examId) {
       setExamId(examId);
       setStep(initialStep as 1 | 2); // Reset step if opening a different exam, or jump to specific step
    }
  }, [examId, storeExamId, setExamId, setStep, initialStep, setIsAddingSection, setIsAiMode]);

  // Form State for Step 1
  const [title, setTitle] = useState("");
  const [type, setType] = useState("SCHEDULED");
  const [duration, setDuration] = useState("60");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalMarks, setTotalMarks] = useState("0");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [joinCode, setJoinCode] = useState("");
  const [requireFeedback, setRequireFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishScheduled, setIsPublishScheduled] = useState(false);
  const [publishTime, setPublishTime] = useState("");

  const calculatedDuration = React.useMemo(() => {
    if (startTime && endTime) {
      const diff = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
      return diff > 0 ? diff.toString() : "0";
    }
    return "0";
  }, [startTime, endTime]);

  useEffect(() => {
    if (!examId) return;
    const fetchExam = async () => {
      try {
        const res = await getExamByIdService(examId);
        const data = res.data || res;
        setTitle(data.title || "");
        if (data.type) setType(data.type);
        if (data.duration) setDuration(data.duration.toString());
        setTotalMarks(data.totalMarks?.toString() || "100");
        if (data.instructions && Array.isArray(data.instructions)) {
          setInstructions(data.instructions.length > 0 ? data.instructions : [""]);
        }
        if (data.requireFeedback !== undefined) setRequireFeedback(data.requireFeedback);
        if (data.joinCode) setJoinCode(data.joinCode);
        
        if (data.publishTime) {
          setIsPublishScheduled(true);
          const date = new Date(data.publishTime);
          setPublishTime(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16));
        } else {
          setIsPublishScheduled(false);
          setPublishTime("");
        }

        // Format dates for datetime-local input
        if (data.startTime) {
          const date = new Date(data.startTime);
          setStartTime(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16));
        }
        if (data.endTime) {
          const date = new Date(data.endTime);
          setEndTime(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16));
        }
      } catch (err) {
        toast.error("Failed to load exam details");
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchExam();
  }, [examId]);

  const handleProceedToQuestions = async () => {
    if (!title) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (type === "SCHEDULED" && (!startTime || !endTime)) {
      toast.error("Please provide start and end times for scheduled exams");
      return;
    }
    
    if (type === "ON_DEMAND" && !duration) {
      toast.error("Please provide duration for on-demand exams");
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        title,
        type,
        instructions: instructions.filter(i => i.trim() !== ""),
        totalMarks: 0,
        requireFeedback
      };

      if (type === "SCHEDULED") {
        payload.startTime = new Date(startTime).toISOString();
        payload.endTime = new Date(endTime).toISOString();
      } else {
        payload.duration = parseInt(duration);
        if (startTime) payload.startTime = new Date(startTime).toISOString();
        if (endTime) payload.endTime = new Date(endTime).toISOString();
      }

      await updateExamService(examId, payload);
      toast.success("Exam details updated successfully");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to update exam details");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishExam = async () => {
    if (publishTime) {
      const pubDate = new Date(publishTime);
      if (startTime) {
        const startDate = new Date(startTime);
        if (pubDate >= startDate) {
          toast.error("Publish date and time must be before the start date and time of the exam");
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        publishTime: publishTime ? new Date(publishTime).toISOString() : null
      };
      await updateExamService(examId, payload);
      toast.success(publishTime ? "Exam scheduled successfully" : "Exam published successfully");
      resetStore();
      router.push(`/teacher/classrooms/${classroomId}/exams`);
    } catch (err: any) {
      toast.error(err.message || "Failed to publish exam");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingInitial) return <div className="p-10 text-white text-center">Loading exam...</div>;

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Dynamic Header */}
      <header className="h-[88px] flex-shrink-0 flex items-center justify-between px-10 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/teacher/classrooms/${classroomId}/exams`)}
            className="flex items-center justify-center p-2 rounded-lg bg-[#18181b] border border-white/10 hover:bg-white/10 hover:text-white transition-colors text-gray-400 mr-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-2xl font-bold text-white tracking-tight">Edit Exam</h2>
          {joinCode && (
            <span className="px-2.5 py-1 rounded bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-white/10">
              JOIN CODE: {joinCode}
            </span>
          )}
        </div>
        {step === 2 && !isAddingSection && !isAiMode && (
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsAiMode(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-900/50">
              Create with AI
            </Button>
            <Button onClick={() => setIsAddingSection(true)} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-950/40">
              <Plus className="h-4 w-4 mr-2" /> Add Section
            </Button>
            <Button onClick={() => setStep(3)} className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg shadow-green-900/50 ml-2">
              Proceed to Publish <ChevronRight className="h-4 w-4 ml-1 inline-block" />
            </Button>
          </div>
        )}
      </header>

      {/* Main Builder Content */}
      <div className="flex-1 p-6 sm:p-10 max-w-[1400px] mx-auto w-full">
        {/* Stepper */}
        <div className="flex items-center gap-8 mb-10 pl-2">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setStep(1)}>
            <div className={cn("flex items-center justify-center h-11 w-11 rounded-full border-2 text-sm font-bold transition-all duration-300", 
              step === 1 ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-white/20 text-white bg-white/5"
            )}>
              01
            </div>
            <div>
              <h3 className={cn("font-bold text-sm tracking-wide", step === 1 ? "text-orange-400" : "text-gray-300")}>Exam Details</h3>
              <p className="text-[13px] text-gray-500">Global configurations</p>
            </div>
          </div>
          
          <div className="h-[1px] w-8 bg-white/10"></div>
          
          <div className={cn("flex items-center gap-4 transition-all duration-300 cursor-pointer", step === 1 ? "opacity-50" : "opacity-100")} onClick={() => { if (examId) setStep(2); }}>
            <div className={cn("flex items-center justify-center h-11 w-11 rounded-full border-2 text-sm font-bold transition-all duration-300", 
              step === 2 ? "border-orange-500 text-sky-200 bg-orange-500/10" : "border-white/10 text-white/60"
            )}>
              02
            </div>
            <div>
              <h3 className={cn("font-bold text-sm tracking-wide", step === 2 ? "text-sky-200" : "text-white/60")}>Question Builder</h3>
              <p className="text-[13px] text-gray-500">Content & structure</p>
            </div>
          </div>

          <div className="h-[1px] w-8 bg-white/10"></div>
          
          <div className={cn("flex items-center gap-4 transition-all duration-300 cursor-pointer", step < 2 ? "opacity-50 cursor-not-allowed" : "opacity-100")} onClick={() => { if (examId) setStep(3); }}>
            <div className={cn("flex items-center justify-center h-11 w-11 rounded-full border-2 text-sm font-bold transition-all duration-300", 
              step === 3 ? "border-orange-500 text-sky-200 bg-orange-500/10" : "border-white/10 text-white/60"
            )}>
              03
            </div>
            <div>
              <h3 className={cn("font-bold text-sm tracking-wide", step === 3 ? "text-sky-200" : "text-white/60")}>Publish</h3>
              <p className="text-[13px] text-gray-500">Release settings</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* Left Column: Form */}
            <Card className="bg-[#0f0f11]/80 border-white/5 shadow-2xl backdrop-blur-xl rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-white tracking-tight">General Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-7">
                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-gray-300">Exam Title</label>
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Advanced Fluid Dynamics - Midterm" 
                    className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 placeholder:text-gray-600 focus-visible:ring-blue-500/50 focus-visible:border-orange-500/50 h-12 rounded-lg"
                  />
                </div>
                
                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-gray-300">Exam Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setType("SCHEDULED")}
                      className={cn(
                        "h-12 border-2 transition-all font-bold text-sm rounded-xl flex items-center justify-center gap-2.5", 
                        type === "SCHEDULED" 
                          ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-400 shadow-lg shadow-orange-950/60 ring-2 ring-orange-500/40" 
                          : "bg-[#14151f] border-white/15 text-zinc-400 hover:bg-[#1a1b2a] hover:text-white"
                      )}
                    >
                      <div className={cn("w-2.5 h-2.5 rounded-full transition-all", type === "SCHEDULED" ? "bg-white shadow-sm" : "bg-zinc-600")} />
                      Scheduled (Fixed Time)
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setType("ON_DEMAND")}
                      className={cn(
                        "h-12 border-2 transition-all font-bold text-sm rounded-xl flex items-center justify-center gap-2.5", 
                        type === "ON_DEMAND" 
                          ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-400 shadow-lg shadow-orange-950/60 ring-2 ring-orange-500/40" 
                          : "bg-[#14151f] border-white/15 text-zinc-400 hover:bg-[#1a1b2a] hover:text-white"
                      )}
                    >
                      <div className={cn("w-2.5 h-2.5 rounded-full transition-all", type === "ON_DEMAND" ? "bg-white shadow-sm" : "bg-zinc-600")} />
                      On-Demand (Flexible)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">{type === "SCHEDULED" ? "Start Time" : "Window Start"}</label>
                    <Input 
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 h-12 rounded-lg focus-visible:ring-blue-500/50 w-full [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">{type === "SCHEDULED" ? "End Time" : "Window End"}</label>
                    <Input 
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 h-12 rounded-lg focus-visible:ring-blue-500/50 w-full [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-gray-300">Duration (Minutes)</label>
                  {type === "SCHEDULED" ? (
                    <Input 
                      type="text"
                      value={calculatedDuration}
                      readOnly
                      className="bg-[#14151f]/50 border border-white/10 text-gray-400 h-12 rounded-lg w-full cursor-not-allowed"
                    />
                  ) : (
                    <Input 
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="60"
                      className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 h-12 rounded-lg focus-visible:ring-blue-500/50 w-full"
                    />
                  )}
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-gray-300">Exam Instructions</label>
                  <div className="space-y-3">
                    {instructions.map((inst, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input 
                          value={inst}
                          onChange={(e) => {
                            const newInst = [...instructions];
                            newInst[idx] = e.target.value;
                            setInstructions(newInst);
                          }}
                          placeholder={`Instruction ${idx + 1}`}
                          className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 placeholder:text-gray-600 focus-visible:ring-blue-500/50 h-10 rounded-lg flex-1"
                        />
                        {instructions.length > 1 && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setInstructions(instructions.filter((_, i) => i !== idx))}
                            className="bg-transparent border-white/10 text-red-400 hover:bg-red-500/10 h-10 w-10 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      onClick={() => setInstructions([...instructions, ""])}
                      className="w-full bg-transparent border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Instruction
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#050505] border border-white/10 rounded-lg">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-gray-300">Require Feedback Form</label>
                    <p className="text-xs text-gray-500">Ask students for feedback after they submit the exam.</p>
                  </div>
                  <Switch checked={requireFeedback} onCheckedChange={setRequireFeedback} />
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Tips & Image */}
            <div className="space-y-6">


              <Card className="bg-[#0f0f11]/80 border-white/5 rounded-xl">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-5">
                  <div className="w-full h-36 bg-[#14151f] rounded-lg border border-white/15 flex items-center justify-center overflow-hidden relative group cursor-pointer">
                    <ImageIcon className="h-10 w-10 text-gray-500" />
                    <div className="absolute inset-0 bg-[#14151f]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <UploadCloud className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium px-2 leading-relaxed">
                    Visual context helps students identify the exam theme instantly.
                  </p>
                  <Button variant="outline" className="w-full bg-[#14151f] border-white/15 hover:bg-[#1f2030] text-white font-semibold">
                    Upload Cover Image
                  </Button>
                </CardContent>
              </Card>

              <div className="pt-4 flex flex-col items-end gap-3">
                <Button 
                  onClick={handleProceedToQuestions}
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white h-12 px-6 font-bold text-[15px] rounded-lg shadow-lg shadow-orange-950/40 transition-all w-full flex items-center justify-center"
                >
                  {isLoading ? "Saving..." : "Save & Edit Questions"}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          <QuestionBuilder examId={examId!} />
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-[#0f0f11]/80 border border-white/5 shadow-2xl backdrop-blur-xl rounded-xl p-6">
              <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Bell className="h-5 w-5 text-purple-400" />
                  Publish Exam Settings
                </CardTitle>
                <p className="text-xs text-gray-400 mt-1">Configure when and how students will see the exam.</p>
              </CardHeader>
              <CardContent className="px-0 space-y-6">
                <div className="space-y-4 p-5 bg-[#050505] border border-white/10 rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Publish Date & Time</label>
                    <p className="text-xs text-gray-500">Before this time, no student is able to see the exam. Leave blank to publish immediately.</p>
                  </div>
                  <div className="space-y-2.5 pt-2 border-t border-white/5">
                    <Input 
                      type="datetime-local"
                      value={publishTime}
                      onChange={(e) => setPublishTime(e.target.value)}
                      className="bg-[#0f0f11] border-white/10 text-white h-11 rounded-lg focus-visible:ring-blue-500 w-full [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    Back to Builder
                  </Button>
                  <Button
                    onClick={handlePublishExam}
                    disabled={isLoading}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-950/40"
                  >
                    {isLoading ? "Saving..." : publishTime ? "Schedule Exam" : "Publish Immediately"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
