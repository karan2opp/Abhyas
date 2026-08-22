"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Bell, Settings, Image as ImageIcon, ChevronRight, UploadCloud, Lightbulb, Plus, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { createExamService, updateExamService } from "../../../../exams/exam.service";
import { getMyClassroomsService } from "../../../classroom.service";
import { listGroupsService } from "../../../group.service";
import { QuestionBuilder } from "./QuestionBuilder";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

function NewExamBuilderContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const classroomId = params.id as string;
  const router = useRouter();
  const { step, setStep, examId, setExamId, isAddingSection, isAiMode, setIsAddingSection, setIsAiMode, resetStore } = useExamBuilderStore();
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    resetStore();
  }, [resetStore]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("SCHEDULED");
  const [duration, setDuration] = useState("60");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalMarks, setTotalMarks] = useState("0");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [joinCode, setJoinCode] = useState("");
  const [requireFeedback, setRequireFeedback] = useState(false);
  const [allowCoTeacherEdit, setAllowCoTeacherEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishScheduled, setIsPublishScheduled] = useState(false);
  const [publishTime, setPublishTime] = useState("");

  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(classroomId);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const classroomIdParam = classroomId;
  const groupIdParam = searchParams.get("groupId") || "";

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyClassroomsService();
        const list = (res.data || []).map((r: any) => r.classroom);
        setClassrooms(list);
        if (classroomIdParam && list.some((c: any) => c.id === classroomIdParam)) {
          setSelectedClassroomId(classroomIdParam);
        }
      } catch (err) {
        toast.error("Failed to load classrooms");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) {
      setGroups([]);
      setSelectedGroupId("");
      return;
    }
    (async () => {
      try {
        const res = await listGroupsService(selectedClassroomId);
        const list = res.data || [];
        setGroups(list);
        if (selectedClassroomId === classroomIdParam && groupIdParam && list.some((g: any) => g.id === groupIdParam)) {
          setSelectedGroupId(groupIdParam);
        } else {
          setSelectedGroupId("");
        }
      } catch (err) {
        toast.error("Failed to load groups");
      }
    })();
  }, [selectedClassroomId]);

  const calculatedDuration = React.useMemo(() => {
    if (startTime && endTime) {
      const diff = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
      return diff > 0 ? diff.toString() : "0";
    }
    return "0";
  }, [startTime, endTime]);

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
        requireFeedback,
        allowCoTeacherEdit,
      };

      if (selectedClassroomId) payload.classroomId = selectedClassroomId;
      if (selectedGroupId) payload.groupId = selectedGroupId;

      if (type === "SCHEDULED") {
        payload.startTime = new Date(startTime).toISOString();
        payload.endTime = new Date(endTime).toISOString();
      } else {
        payload.duration = parseInt(duration);
        if (startTime) payload.startTime = new Date(startTime).toISOString();
        if (endTime) payload.endTime = new Date(endTime).toISOString();
      }

      if (!examId) {
        // Create new exam
        const data = await createExamService(payload);
        const newExam = data.data || data;
        setExamId(newExam.id || newExam._id);
        if (newExam.joinCode) setJoinCode(newExam.joinCode);
        toast.success("Exam details saved successfully");
      } else {
        // Update existing exam
        await updateExamService(examId, payload);
      }
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to save exam details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExam = async (status: "DRAFT" | "PUBLISHED") => {
    if (!examId) return;
    if (status === "PUBLISHED" && publishTime) {
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
        publishTime: publishTime ? new Date(publishTime).toISOString() : null,
        status,
      };
      await updateExamService(examId, payload);
      toast.success(status === "PUBLISHED" ? (publishTime ? "Exam scheduled and published!" : "Exam published successfully!") : "Exam saved as Draft!");
      resetStore();
      router.push(`/teacher/classrooms/${classroomId}/exams`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update exam");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Dynamic Header */}
      <header className="h-[48px] flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-1 border-b border-white/5 bg-[#050505]">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white tracking-tight">New Exam</h2>
          {joinCode && (
            <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-white/10">
              JOIN CODE: {joinCode}
            </span>
          )}
        </div>
        
        {step === 2 && !isAddingSection && !isAiMode && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAiMode(true)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-900/50 h-7 px-2.5">
              Create with AI
            </Button>
            <Button onClick={() => setIsAddingSection(true)} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-md shadow-orange-950/40 h-7 px-2.5">
              <Plus className="h-3 w-3 mr-1" /> Add Section
            </Button>
            <Button onClick={() => handleSaveExam("DRAFT")} size="sm" variant="outline" className="bg-[#18181b]mber-500/10 text-amber-300 border-amber-500/30 hover:bg-[#18181b]mber-500/20 text-xs font-semibold h-7 px-2.5">
              Save as Draft
            </Button>
            <Button onClick={() => setStep(3)} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-md shadow-green-900/50 h-7 px-2.5">
              Publish Settings <ChevronRight className="h-3 w-3 ml-1 inline-block" />
            </Button>
          </div>
        )}
      </header>

      {/* Main Builder Content */}
      <div className="flex-1 p-2 sm:p-3.5 w-full">
        {/* Stepper (Hidden in AI Generator Mode for maximum vertical space) */}
        {!isAiMode && (
          <div className="flex items-center gap-4 mb-2.5 pl-1">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(1)}>
              <div className={cn("flex items-center justify-center h-7 w-7 rounded-full border-2 text-[11px] font-bold transition-all duration-300", 
                step === 1 ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-white/20 text-white bg-white/5"
              )}>
                01
              </div>
              <div>
                <h3 className={cn("font-bold text-xs tracking-wide", step === 1 ? "text-orange-400" : "text-gray-300")}>Exam Details</h3>
                <p className="text-[11px] text-gray-500">Global configurations</p>
              </div>
            </div>
            
            <div className="h-[1px] w-6 bg-white/10"></div>
            
            <div className={cn("flex items-center gap-2 transition-all duration-300 cursor-pointer", step === 1 ? "opacity-50 cursor-not-allowed" : "opacity-100")} onClick={() => { if (examId) setStep(2); }}>
              <div className={cn("flex items-center justify-center h-7 w-7 rounded-full border-2 text-[11px] font-bold transition-all duration-300", 
                step === 2 ? "border-orange-500 text-sky-200 bg-orange-500/10" : "border-white/10 text-white/60"
              )}>
                02
              </div>
              <div>
                <h3 className={cn("font-bold text-xs tracking-wide", step === 2 ? "text-sky-200" : "text-white/60")}>Question Builder</h3>
                <p className="text-[11px] text-gray-500">Content & structure</p>
              </div>
            </div>

            <div className="h-[1px] w-6 bg-white/10"></div>
            
            <div className={cn("flex items-center gap-2 transition-all duration-300 cursor-pointer", step < 2 ? "opacity-50 cursor-not-allowed" : "opacity-100")} onClick={() => { if (examId) setStep(3); }}>
              <div className={cn("flex items-center justify-center h-7 w-7 rounded-full border-2 text-[11px] font-bold transition-all duration-300", 
                step === 3 ? "border-orange-500 text-sky-200 bg-orange-500/10" : "border-white/10 text-white/60"
              )}>
                03
              </div>
              <div>
                <h3 className={cn("font-bold text-xs tracking-wide", step === 3 ? "text-sky-200" : "text-white/60")}>Publish</h3>
                <p className="text-[11px] text-gray-500">Release settings</p>
              </div>
            </div>
          </div>
        )}

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
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">Classroom (optional)</label>
                    <select
                      value={selectedClassroomId}
                      disabled
                      className="w-full bg-[#050505]/50 border border-white/5 text-gray-400 h-12 rounded-lg px-3 focus:outline-none text-sm cursor-not-allowed"
                    >
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Lets classroom members start directly, no code needed.</p>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">Group (optional)</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      disabled={!selectedClassroomId}
                      className="w-full bg-[#050505] border border-white/10 text-white h-12 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Class-wide (all students)</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Restrict to one group instead of the whole classroom.</p>
                  </div>
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

                <div className="flex items-center justify-between p-4 bg-[#050505] border border-white/10 rounded-lg">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-gray-300">Allow Co-Teacher Editing</label>
                    <p className="text-xs text-gray-500">Let co-teachers of this classroom edit this exam's questions and content.</p>
                  </div>
                  <Switch checked={allowCoTeacherEdit} onCheckedChange={setAllowCoTeacherEdit} />
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Tips & Image */}
            <div className="space-y-6">


              <Card className="bg-[#0f0f11]/80 border-white/5 rounded-xl">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-5">
                  <div className="w-full h-36 bg-[#050505] rounded-lg border border-white/5 flex items-center justify-center overflow-hidden relative group cursor-pointer">
                    <ImageIcon className="h-10 w-10 text-gray-700" />
                    <div className="absolute inset-0 bg-[#14151f] border-white/15 text-white placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <UploadCloud className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium px-2 leading-relaxed">
                    Visual context helps students identify the exam theme instantly.
                  </p>
                  <Button variant="outline" className="w-full bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white font-semibold">
                    Upload Cover Image
                  </Button>
                </CardContent>
              </Card>

              <div className="pt-4 flex flex-col items-end gap-3">
                <Button 
                  onClick={handleProceedToQuestions}
                  disabled={isLoading}
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white h-12 px-6 font-bold text-[15px] rounded-lg shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_25px_rgba(124,58,237,0.5)] transition-all w-full flex items-center justify-center"
                >
                  {isLoading ? "Saving..." : "Proceed to Questions"}
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

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white text-xs h-10"
                  >
                    Back to Builder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSaveExam("DRAFT")}
                    disabled={isLoading}
                    className="flex-1 bg-[#18181b]mber-500/10 text-amber-300 border-amber-500/30 hover:bg-[#18181b]mber-500/20 text-xs font-semibold h-10"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleSaveExam("PUBLISHED")}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-10 shadow-lg shadow-green-900/40"
                  >
                    {isLoading ? "Saving..." : publishTime ? "Schedule & Publish" : "Publish Exam"}
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

export default function NewExamBuilder() {
  return (
    <Suspense fallback={<div className="p-10 text-white text-center">Loading...</div>}>
      <NewExamBuilderContent />
    </Suspense>
  );
}
