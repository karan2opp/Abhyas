"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, Trash2, CheckCircle2, Circle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { generateQuestionService, createQuestionService } from "../exam.service";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

type AIGeneratorViewProps = {
  sectionId: string;
  onBack: () => void;
  refresh: () => void;
};

export function AIGeneratorView({ sectionId, onBack, refresh }: AIGeneratorViewProps) {
  // Form State
  const [subject, setSubject] = useState("Programming");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [count, setCount] = useState("5");
  const [type, setType] = useState<"mcq" | "text">("mcq");
  const [customInstructions, setCustomInstructions] = useState("");
  const [includeExplanation, setIncludeExplanation] = useState(true);

  const { aiGeneratedQuestions: generatedQuestions, setAiGeneratedQuestions: setGeneratedQuestions, clearAiGeneratedQuestions } = useExamBuilderStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Draggable Window State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Resizable Splitter State
  const [leftWidth, setLeftWidth] = useState(450); // Wider left box
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  // Center window on mount
  useEffect(() => {
    setPosition({
      x: Math.max(0, (window.innerWidth - 1200) / 2),
      y: Math.max(0, (window.innerHeight - 800) / 2)
    });
  }, []);

  // Handle Window Drag
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingWindow) return;
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    };
    const handleWindowMouseUp = () => setIsDraggingWindow(false);
    
    if (isDraggingWindow) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingWindow]);

  const handleWindowDragStart = (e: React.MouseEvent) => {
    // Only drag if clicking the header background, not buttons
    if ((e.target as HTMLElement).closest('.window-drag-handle')) {
      setIsDraggingWindow(true);
      dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  // Handle Splitter Drag
  useEffect(() => {
    const handleSplitterMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter) return;
      // Calculate new width based on mouse X relative to the window's left edge
      const newWidth = e.clientX - position.x;
      setLeftWidth(Math.max(300, Math.min(800, newWidth)));
    };
    const handleSplitterMouseUp = () => setIsDraggingSplitter(false);
    
    if (isDraggingSplitter) {
      window.addEventListener('mousemove', handleSplitterMouseMove);
      window.addEventListener('mouseup', handleSplitterMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', handleSplitterMouseMove);
      window.removeEventListener('mouseup', handleSplitterMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDraggingSplitter, position.x]);

  const handleGenerate = async () => {
    if (!topic.trim() || !subtopic.trim()) {
      toast.error("Topic and subtopic are required");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        subject,
        difficulty,
        topics: [
          {
            name: topic,
            subtopics: [
              {
                name: subtopic,
                count: Number(count),
                questionTypes: [type]
              }
            ]
          }
        ],
        textMarks: 5,
        includeExplanation,
        ...(customInstructions.trim() ? { customInstructions } : {})
      };

      const res = await generateQuestionService(payload);

      let parsed;
      try {
        let cleanRes = res.data || res;
        if (typeof cleanRes === 'string') {
          cleanRes = cleanRes.replace(/```json/g, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleanRes);
        } else {
          parsed = cleanRes;
        }
      } catch (e) {
        throw new Error("Failed to parse AI response");
      }

      if (parsed && parsed.questions) {
        // Map to editable format
        const editable = parsed.questions.map((q: any) => ({
          ...q,
          _localId: Math.random().toString(36).substring(7),
          // Ensure options are objects if mcq
          optionsList: q.options ? q.options.map((opt: string) => ({
            value: opt,
            isCorrect: opt === q.correctAnswer
          })) : []
        }));
        setGeneratedQuestions(editable);
        toast.success(`Generated ${editable.length} questions`);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestion = (id: string, field: string, value: any) => {
    setGeneratedQuestions(prev => prev.map(q => q._localId === id ? { ...q, [field]: value } : q));
  };

  const handleUpdateOption = (qId: string, optIndex: number, field: string, value: any) => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q._localId !== qId) return q;
      const newOpts = [...q.optionsList];
      if (field === 'isCorrect') {
        // Uncheck others if single choice
        newOpts.forEach(o => o.isCorrect = false);
      }
      newOpts[optIndex] = { ...newOpts[optIndex], [field]: value };
      return { ...q, optionsList: newOpts };
    }));
  };

  const handleAddOption = (qId: string) => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q._localId !== qId) return q;
      return { ...q, optionsList: [...q.optionsList, { value: "New Option", isCorrect: false }] };
    }));
  };

  const handleRemoveOption = (qId: string, optIndex: number) => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q._localId !== qId) return q;
      const newOpts = q.optionsList.filter((_: any, i: number) => i !== optIndex);
      return { ...q, optionsList: newOpts };
    }));
  };

  const handleRemoveQuestion = (id: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q._localId !== id));
  };

  const handleSaveAll = async () => {
    if (generatedQuestions.length === 0) return;
    setIsSaving(true);
    try {
      for (const gq of generatedQuestions) {
        let finalType = gq.type === 'theory' || gq.type === 'practical' ? (gq.optionsList.length > 0 ? 'mcq' : 'descriptive') : gq.type;
        if (finalType !== 'mcq' && finalType !== 'descriptive') {
           finalType = gq.optionsList.length > 0 ? 'mcq' : 'descriptive';
        }

        let payloadOptions = undefined;
        if (finalType === 'mcq' && gq.optionsList.length > 0) {
           payloadOptions = gq.optionsList;
           if (!payloadOptions.some((o:any) => o.isCorrect)) {
              payloadOptions[0].isCorrect = true;
           }
        }
        
        await createQuestionService({
          sectionId,
          type: finalType,
          description: gq.question,
          marks: Number(gq.marks) || 1,
          ...(finalType === 'mcq' && { options: payloadOptions }),
          ...(gq.explanation && { explanation: gq.explanation })
        });
      }
      toast.success("All questions saved to section!");
      clearAiGeneratedQuestions();
      refresh();
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to save questions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="absolute flex flex-col bg-[#0b0f19] rounded-xl overflow-hidden border border-purple-500/30 shadow-[0_0_50px_rgba(147,51,234,0.15)] pointer-events-auto"
      style={{ 
        width: '1200px', 
        height: '800px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDraggingWindow ? 'none' : 'transform 0.1s ease-out'
      }}
    >
      {/* Header (Draggable) */}
      <div 
        className="flex items-center justify-between px-6 py-4 bg-[#111520] border-b border-white/5 cursor-move window-drag-handle shrink-0"
        onMouseDown={handleWindowDragStart}
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" /> AI Question Studio
            </h3>
            <p className="text-xs text-gray-400">Generate and refine questions before adding to section</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Prompt Configuration */}
        <div 
          className="flex flex-col border-r border-white/5 bg-[#111520]/50 shrink-0"
          style={{ width: `${leftWidth}px` }}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-300 border-b border-white/10 pb-2">Generation Parameters</h4>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase">Subject</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} className="bg-[#0b0f19] border-white/10 text-white" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold uppercase">Topic</label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Loops" className="bg-[#0b0f19] border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold uppercase">Subtopic</label>
                  <Input value={subtopic} onChange={e => setSubtopic(e.target.value)} placeholder="e.g. For loop" className="bg-[#0b0f19] border-white/10 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold uppercase">Difficulty</label>
                  <select 
                    value={difficulty} 
                    onChange={e => setDifficulty(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-[#0b0f19] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold uppercase">Type</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value as "mcq" | "text")}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-[#0b0f19] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="mcq">MCQ</option>
                    <option value="text">Descriptive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase">Count</label>
                <Input type="number" min="1" max="20" value={count} onChange={e => setCount(e.target.value)} className="bg-[#0b0f19] border-white/10 text-white" />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs text-gray-400 font-bold uppercase">Extra Instructions (Optional)</label>
                <Textarea 
                  placeholder="e.g. 'Make them scenario based', 'Focus on edge cases'..."
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                  className="bg-[#0b0f19] border-white/10 text-white min-h-[120px]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIncludeExplanation(!includeExplanation)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
                    includeExplanation ? "bg-purple-600" : "bg-gray-600"
                  )}
                  role="switch"
                  aria-checked={includeExplanation}
                >
                  <span className="sr-only">Include Explanation</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      includeExplanation ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-gray-300">
                  Include Explanations
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-white/5 bg-[#111520]">
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
              {isGenerating ? "Generating..." : "Generate Questions"}
            </Button>
          </div>
        </div>

        {/* Resizable Splitter */}
        <div 
          className="w-2 bg-transparent hover:bg-purple-500/20 active:bg-purple-500/40 cursor-col-resize shrink-0 transition-colors flex items-center justify-center group"
          onMouseDown={() => setIsDraggingSplitter(true)}
        >
          <div className="w-0.5 h-8 bg-white/10 group-hover:bg-purple-400 rounded-full" />
        </div>

        {/* Right: Interactive Preview */}
        <div className="flex-1 flex flex-col bg-[#0b0f19] relative min-w-0">
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {generatedQuestions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                <Sparkles className="h-16 w-16 opacity-20" />
                <p>Set your parameters and click Generate to see questions here.</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto pb-20">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold text-white">Generated Questions ({generatedQuestions.length})</h3>
                  <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={clearAiGeneratedQuestions}>
                    Clear All
                  </Button>
                </div>
                
                {generatedQuestions.map((q, idx) => (
                  <Card key={q._localId} className="bg-[#111520] border-white/5 hover:border-purple-500/30 transition-all overflow-hidden group">
                    <div className="px-6 py-3 bg-[#1a1f2e] border-b border-white/5 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Question {idx + 1}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveQuestion(q._localId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-3">
                        <label className="text-xs text-gray-500 font-bold uppercase">Question Text</label>
                        <Textarea 
                          value={q.question}
                          onChange={e => handleUpdateQuestion(q._localId, 'question', e.target.value)}
                          className="bg-[#0b0f19] border-white/10 text-white min-h-[80px]"
                        />
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="space-y-2 flex-1">
                          <label className="text-xs text-gray-500 font-bold uppercase">Marks</label>
                          <Input 
                            type="number"
                            value={q.marks || 1}
                            onChange={e => handleUpdateQuestion(q._localId, 'marks', e.target.value)}
                            className="bg-[#0b0f19] border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-2 flex-1">
                          <label className="text-xs text-gray-500 font-bold uppercase">Type</label>
                          <Input 
                            value={q.type}
                            readOnly
                            className="bg-[#0b0f19]/50 border-white/5 text-gray-500 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {q.optionsList && q.optionsList.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <label className="text-xs text-gray-500 font-bold uppercase">Options</label>
                          <div className="space-y-2">
                            {q.optionsList.map((opt: any, optIdx: number) => (
                              <div key={optIdx} className={cn("flex items-center gap-3 p-2 rounded-lg border", opt.isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-[#0b0f19] border-white/5")}>
                                <button onClick={() => handleUpdateOption(q._localId, optIdx, 'isCorrect', !opt.isCorrect)} className="shrink-0 p-1">
                                  {opt.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600 hover:text-white" />}
                                </button>
                                <Input 
                                  value={opt.value} 
                                  onChange={e => handleUpdateOption(q._localId, optIdx, 'value', e.target.value)}
                                  className="bg-transparent border-none text-white h-8 shadow-none focus-visible:ring-0 p-0 text-sm" 
                                />
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveOption(q._localId, optIdx)} className="h-7 w-7 text-gray-500 hover:text-red-400 shrink-0">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleAddOption(q._localId)} className="bg-transparent border-dashed border-white/10 text-gray-400 hover:text-white mt-2">
                            <Plus className="h-4 w-4 mr-2" /> Add Option
                          </Button>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <label className="text-xs text-purple-400/70 font-bold uppercase">Explanation (Reference)</label>
                          <p className="text-sm text-gray-400 italic bg-purple-500/5 p-3 rounded-md border border-purple-500/10">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {generatedQuestions.length > 0 && (
            <div className="p-6 bg-[#111520] border-t border-white/5 flex items-center justify-between sticky bottom-0">
              <span className="text-sm text-gray-400 font-medium">Please review and edit questions before saving.</span>
              <Button onClick={handleSaveAll} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8 shadow-[0_0_20px_rgba(22,163,74,0.4)] text-lg">
                {isSaving ? "Saving..." : `Save All ${generatedQuestions.length} Questions`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
