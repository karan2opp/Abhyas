"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2, ArrowRight, Loader2, CheckCircle2, ChevronRight, Save, LayoutDashboard, Sparkles } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CreateExamPage() {
  const router = useRouter();
  
  // Step 1: Form, Step 2: Summary, Step 3: Generating/Saving
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    difficulty: "Medium",
    specialInstructions: "",
    sections: [
      {
        id: Date.now().toString(),
        name: "Section 1",
        topics: "",
        groups: [
          {
            id: Date.now().toString(),
            questionType: "mcq",
            marksPerQuestion: 1,
            numberOfQuestions: 5,
          }
        ]
      }
    ]
  });

  const calculateSectionMarks = (section: any) => {
    return section.groups.reduce((acc: number, g: any) => acc + (Number(g.marksPerQuestion) || 0) * (Number(g.numberOfQuestions) || 0), 0);
  };

  const calculateSectionQuestions = (section: any) => {
    return section.groups.reduce((acc: number, g: any) => acc + (Number(g.numberOfQuestions) || 0), 0);
  };

  const totalExamMarks = formData.sections.reduce((acc, section) => acc + calculateSectionMarks(section), 0);
  const totalExamQuestions = formData.sections.reduce((acc, section) => acc + calculateSectionQuestions(section), 0);

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: Date.now().toString(),
          name: `Section ${prev.sections.length + 1}`,
          topics: "",
          groups: [
            {
              id: Date.now().toString(),
              questionType: "mcq",
              marksPerQuestion: 1,
              numberOfQuestions: 5,
            }
          ]
        }
      ]
    }));
  };

  const removeSection = (id: string) => {
    if (formData.sections.length === 1) {
      toast.error("You must have at least one section");
      return;
    }
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id)
    }));
  };

  const updateSection = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const addGroup = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? {
        ...s,
        groups: [...s.groups, { id: Date.now().toString(), questionType: "mcq", marksPerQuestion: 1, numberOfQuestions: 5 }]
      } : s)
    }));
  };

  const removeGroup = (sectionId: string, groupId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== sectionId) return s;
        if (s.groups.length === 1) {
          toast.error("A section must have at least one question group");
          return s;
        }
        return { ...s, groups: s.groups.filter((g: any) => g.id !== groupId) };
      })
    }));
  };

  const updateGroup = (sectionId: string, groupId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? {
        ...s,
        groups: s.groups.map((g: any) => g.id === groupId ? { ...g, [field]: value } : g)
      } : s)
    }));
  };

  const handleProceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject) {
      toast.error("Please fill in the exam title and subject");
      return;
    }
    const invalidSection = formData.sections.find(s => !s.name || !s.topics || s.groups.length === 0 || s.groups.some((g: any) => g.numberOfQuestions <= 0));
    if (invalidSection) {
      toast.error("Please fill in all section details properly (topics and number of questions are required)");
      return;
    }
    setStep(2);
  };

  const handleGenerateAndSave = async () => {
    setStep(3);
    setLoading(true);
    
    try {
      setLoadingMessage("Validating exam scope and topics...");
      // Backend API call to generate exam
      const res = await api.post("/exams/generate-from-form", formData);
      const generatedExam = res.data.data;
      
      setLoadingMessage("Saving generated exam and questions...");
      
      // Save exam to DB
      const type = generatedExam.examType === "fixed" ? "SCHEDULED" : "ON_DEMAND";
      const payload: any = {
        title: generatedExam.title || formData.title,
        description: generatedExam.description || `${formData.subject} exam`,
        type,
        totalMarks: generatedExam.totalMarks || totalExamMarks,
        instructions: generatedExam.instructions || ["Please read all questions carefully."],
        requireFeedback: false,
        duration: generatedExam.duration || 60
      };
      
      const examRes = await api.post("/exams", payload);
      const newExamId = examRes.data.data.id || examRes.data.data._id;

      for (const section of generatedExam.sections) {
        const secRes = await api.post("/sections", {
          examId: newExamId,
          title: section.title || section.name || "Exam Section"
        });
        
        const sectionId = secRes.data.data.id || secRes.data.data._id;

        for (const q of section.questions) {
          const qPayload: any = {
            sectionId,
            type: q.type === "mcq" ? "mcq" : "descriptive",
            description: q.description || q.question || q.text || "No description provided.",
            marks: q.marks || 1
          };
          if (q.type === "mcq" && Array.isArray(q.options)) {
            qPayload.options = q.options.map((opt: any, idx: number) => {
              if (typeof opt === 'string') {
                return { value: String(opt).trim() || `Option ${idx + 1}`, isCorrect: false };
              }
              const val = opt.value || opt.text || opt.label || opt.option || `Option ${idx + 1}`;
              return {
                value: String(val).trim() || `Option ${idx + 1}`,
                isCorrect: !!opt.isCorrect
              };
            });
            if (qPayload.options.length > 0 && !qPayload.options.some((o: any) => o.isCorrect)) {
              qPayload.options[0].isCorrect = true;
            }
          }
          await api.post("/questions", qPayload);
        }
      }
      
      toast.success("Exam generated and saved successfully!");
      router.push(`/teacher/exams/${newExamId}?step=2`);
      
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to generate exam. Please try again.";
      toast.error(msg);
      setStep(2); // Go back to summary
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#0a0d14]/80 backdrop-blur-xl flex items-center px-6 shrink-0 shadow-sm">
        <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-400" />
          AI Exam Builder
        </h2>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 pb-24">
        {step === 1 && (
          <form onSubmit={handleProceedToSummary} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-[#111520] border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Exam Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Exam Title *</label>
                  <Input 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Midterm Computer Science"
                    className="bg-[#1a1f2e] border-white/10 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Subject *</label>
                  <Input 
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. Computer Science"
                    className="bg-[#1a1f2e] border-white/10 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Difficulty</label>
                  <select 
                    value={formData.difficulty}
                    onChange={e => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full bg-[#1a1f2e] border border-white/10 text-white rounded-md h-10 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Special Instructions (Optional)</label>
                <textarea 
                  value={formData.specialInstructions}
                  onChange={e => setFormData({...formData, specialInstructions: e.target.value})}
                  placeholder="e.g. Include scenario-based questions, avoid true/false..."
                  className="w-full bg-[#1a1f2e] border border-white/10 text-white rounded-md p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-indigo-500" />
                  Exam Sections
                </h3>
                <Button type="button" onClick={addSection} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add Section
                </Button>
              </div>

              {formData.sections.map((section, idx) => (
                <div key={section.id} className="bg-[#111520]/80 border border-white/10 rounded-2xl p-6 relative group">
                  <button 
                    type="button"
                    onClick={() => removeSection(section.id)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove section"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  
                  <div className="mb-4">
                    <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-500/20">
                      Section {idx + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Section Name *</label>
                      <Input 
                        value={section.name}
                        onChange={e => updateSection(section.id, 'name', e.target.value)}
                        placeholder="e.g. Logic & Reasoning"
                        className="bg-[#1a1f2e] border-white/10 text-white h-9"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Topics to Cover *</label>
                      <Input 
                        value={section.topics}
                        onChange={e => updateSection(section.id, 'topics', e.target.value)}
                        placeholder="e.g. arrays, strings, dynamic programming"
                        className="bg-[#1a1f2e] border-white/10 text-white h-9"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2 space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Question Groups</label>
                        <Button 
                          type="button" 
                          onClick={() => addGroup(section.id)} 
                          variant="ghost" 
                          className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Group
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {section.groups.map((group: any, gIdx: number) => (
                          <div key={group.id} className="grid grid-cols-12 gap-3 items-end bg-[#0a0d14]/50 p-3 rounded-lg border border-white/5 relative group/item">
                            <div className="col-span-12 sm:col-span-5 space-y-1.5">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Type</label>
                              <select 
                                value={group.questionType}
                                onChange={e => updateGroup(section.id, group.id, 'questionType', e.target.value)}
                                className="w-full bg-[#1a1f2e] border border-white/10 text-white rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              >
                                <option value="mcq">Multiple Choice</option>
                                <option value="subjective">Descriptive</option>
                              </select>
                            </div>
                            <div className="col-span-6 sm:col-span-3 space-y-1.5">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Questions</label>
                              <Input 
                                type="number"
                                min="1"
                                value={group.numberOfQuestions}
                                onChange={e => updateGroup(section.id, group.id, 'numberOfQuestions', parseInt(e.target.value) || 0)}
                                className="bg-[#1a1f2e] border-white/10 text-white h-9 text-center"
                              />
                            </div>
                            <div className="col-span-6 sm:col-span-3 space-y-1.5">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Marks Each</label>
                              <Input 
                                type="number"
                                min="1"
                                value={group.marksPerQuestion}
                                onChange={e => updateGroup(section.id, group.id, 'marksPerQuestion', parseInt(e.target.value) || 0)}
                                className="bg-[#1a1f2e] border-white/10 text-white h-9 text-center"
                              />
                            </div>
                            <div className="col-span-12 sm:col-span-1 flex justify-end sm:justify-center">
                              <button
                                type="button"
                                onClick={() => removeGroup(section.id, group.id)}
                                className="h-9 w-9 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                title="Remove Group"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                    <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded text-sm text-gray-300 flex items-center gap-4">
                      <span>Total Questions: <span className="text-white font-bold">{calculateSectionQuestions(section)}</span></span>
                      <span>Total Marks: <span className="text-white font-bold">{calculateSectionMarks(section)}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
              <div>
                <p className="text-sm text-blue-300">Total Exam Overview</p>
                <div className="flex gap-6 mt-1">
                  <span className="text-white font-medium">{totalExamQuestions} Questions</span>
                  <span className="text-white font-medium">{totalExamMarks} Total Marks</span>
                </div>
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                Review Summary <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="bg-gradient-to-br from-[#111520] to-[#151a28] border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{formData.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="bg-white/5 px-2.5 py-1 rounded text-gray-300 border border-white/10">{formData.subject}</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-400"/> {formData.difficulty}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-400">{totalExamMarks}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">Total Marks</div>
                </div>
              </div>

              {formData.specialInstructions && (
                <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative z-10">
                  <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Special Instructions</h4>
                  <p className="text-amber-200/80 text-sm">{formData.specialInstructions}</p>
                </div>
              )}

              <div className="space-y-4 relative z-10">
                <h3 className="text-lg font-bold text-white mb-4">Structure ({formData.sections.length} Sections, {totalExamQuestions} Questions)</h3>
                
                {formData.sections.map((sec, idx) => (
                  <div key={sec.id} className="bg-[#0a0d14]/50 border border-white/5 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-blue-400 font-bold text-sm">S{idx + 1}</span>
                          <h4 className="text-white font-medium">{sec.name}</h4>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">Topics: <span className="text-gray-400">{sec.topics}</span></p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-gray-400 text-[10px] uppercase font-bold">Questions</div>
                          <div className="text-white font-medium">{calculateSectionQuestions(sec)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-[10px] uppercase font-bold">Marks</div>
                          <div className="text-white font-medium">{calculateSectionMarks(sec)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {sec.groups.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 border-l-2 border-white/10">
                        {sec.groups.map((g: any, gIdx: number) => (
                          <div key={gIdx} className="bg-white/5 px-3 py-2 rounded flex justify-between items-center text-xs">
                            <span className="text-gray-300">{g.questionType === 'mcq' ? 'MCQ' : 'Descriptive'}</span>
                            <span className="text-gray-400">{g.numberOfQuestions} Qs × {g.marksPerQuestion} marks</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button onClick={() => setStep(1)} variant="outline" className="border-white/10 text-white bg-transparent hover:bg-white/5">
                Back to Edit
              </Button>
              <Button onClick={handleGenerateAndSave} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 h-12 text-base shadow-lg shadow-blue-900/20">
                <Sparkles className="h-4 w-4 mr-2" /> Generate Exam Content
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-in fade-in duration-1000">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-500/20 rounded-full flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
                <Sparkles className="h-8 w-8 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">AI is doing its magic...</h2>
              <p className="text-blue-300/80 animate-pulse">{loadingMessage}</p>
            </div>
            <div className="text-xs text-gray-500 max-w-sm text-center mt-8">
              This might take a minute as we generate unique questions and validate them against our educational guardrails.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
