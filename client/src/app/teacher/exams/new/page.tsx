"use client";

import React, { useState } from "react";
import { Bell, Settings, Image as ImageIcon, ChevronRight, UploadCloud, Lightbulb, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { createExamService, updateExamService } from "../exam.service";
import { QuestionBuilder } from "./QuestionBuilder";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

export default function NewExamBuilder() {
  const { step, setStep, examId, setExamId } = useExamBuilderStore();
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [joinCode, setJoinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const calculatedDuration = React.useMemo(() => {
    if (startTime && endTime) {
      const diff = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
      return diff > 0 ? diff.toString() : "0";
    }
    return "0";
  }, [startTime, endTime]);

  const handleProceedToQuestions = async () => {
    if (!title || !startTime || !endTime || !totalMarks) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title,
        instructions: instructions.filter(i => i.trim() !== ""),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        totalMarks: parseInt(totalMarks)
      };

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

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Dynamic Header */}
      <header className="h-[88px] flex-shrink-0 flex items-center justify-between px-10 border-b border-white/5">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">New Assessment</h2>
          {joinCode && (
            <span className="px-2.5 py-1 rounded bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-white/10">
              JOIN CODE: {joinCode}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-5">
          <Avatar className="h-10 w-10 cursor-pointer border-2 border-white/10 hover:border-purple-500/50 transition-all">
            <AvatarImage src="" />
            <AvatarFallback className="bg-green-900/50 text-green-300 text-xs font-semibold">JD</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Builder Content */}
      <div className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
        {/* Stepper */}
        <div className="flex items-center gap-8 mb-10 pl-2">
          <div className="flex items-center gap-4">
            <div className={cn("flex items-center justify-center h-11 w-11 rounded-full border-2 text-sm font-bold transition-all duration-300", 
              step === 1 ? "border-purple-500 text-purple-400 bg-purple-500/10" : "border-white/20 text-white bg-white/5"
            )}>
              01
            </div>
            <div>
              <h3 className={cn("font-bold text-sm tracking-wide", step === 1 ? "text-purple-400" : "text-gray-300")}>Exam Details</h3>
              <p className="text-[13px] text-gray-500">Global configurations</p>
            </div>
          </div>
          
          <div className="h-[1px] w-12 bg-white/10"></div>
          
          <div className={cn("flex items-center gap-4 transition-all duration-300", step === 1 ? "opacity-50" : "opacity-100")}>
            <div className={cn("flex items-center justify-center h-11 w-11 rounded-full border-2 text-sm font-bold transition-all duration-300", 
              step === 2 ? "border-purple-500 text-purple-400 bg-purple-500/10" : "border-white/10 text-gray-500"
            )}>
              02
            </div>
            <div>
              <h3 className={cn("font-bold text-sm tracking-wide", step === 2 ? "text-purple-400" : "text-gray-500")}>Question Builder</h3>
              <p className="text-[13px] text-gray-500">Content & structure</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* Left Column: Form */}
            <Card className="bg-[#111520]/80 border-white/5 shadow-2xl backdrop-blur-xl rounded-xl">
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
                    className="bg-[#0b0f19] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50 h-12 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">Duration (Minutes)</label>
                    <Input 
                      type="text"
                      value={calculatedDuration}
                      readOnly
                      className="bg-[#0b0f19]/50 border-white/5 text-gray-500 h-12 rounded-lg w-full cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">Total Marks</label>
                    <Input 
                      type="number"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(e.target.value)}
                      placeholder="100" 
                      className="bg-[#0b0f19] border-white/10 text-white h-12 rounded-lg focus-visible:ring-purple-500/50 w-full"
                    />
                  </div>
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
                          className="bg-[#0b0f19] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-purple-500/50 h-10 rounded-lg flex-1"
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

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">Start Time</label>
                    <Input 
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-[#0b0f19] border-white/10 text-white h-12 rounded-lg focus-visible:ring-purple-500/50 w-full [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-semibold text-gray-300">End Time</label>
                    <Input 
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-[#0b0f19] border-white/10 text-white h-12 rounded-lg focus-visible:ring-purple-500/50 w-full [color-scheme:dark]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Tips & Image */}
            <div className="space-y-6">
              <Card className="bg-[#1a162b] border-[#2d224a] shadow-xl rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Lightbulb className="h-5 w-5 text-purple-400" />
                    <h4 className="font-bold text-white tracking-wide">Pro Tip</h4>
                  </div>
                  <p className="text-[13px] text-gray-300 leading-relaxed">
                    For optimal engagement, limit exam duration to 120 minutes. Students typically peak in performance within the first 45 minutes of assessment.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#111520]/80 border-white/5 rounded-xl">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-5">
                  <div className="w-full h-36 bg-[#0b0f19] rounded-lg border border-white/5 flex items-center justify-center overflow-hidden relative group cursor-pointer">
                    <ImageIcon className="h-10 w-10 text-gray-700" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <UploadCloud className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium px-2 leading-relaxed">
                    Visual context helps students identify the assessment theme instantly.
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
        ) : (
          <QuestionBuilder examId={examId!} />
        )}
      </div>
    </div>
  );
}
