"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Layers, Plus, Trash2, Edit2, Check, X, CheckCircle2, Circle, Settings2, Zap, Sparkles, ChevronDown, ChevronUp, Code, BarChart2, FileText, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { BlueprintTreeViewer, BlueprintTree } from "@/components/BlueprintTreeViewer";
import {
  createSectionService, getSectionsWithDetailsService, updateSectionService, deleteSectionService,
  createQuestionService, updateQuestionService, deleteQuestionService,
  createOptionService, updateOptionService, deleteOptionService,
  saveGeneratedExamService, getExamByIdService,
  generateBlueprintService, verifyBlueprintService, enqueueGenerateFromBlueprintService, getGenerationJobService
} from "../../../../exams/exam.service";
import { generateSingleQuestionService } from "../../../../assignments/assignment.service";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

export type EditorConfig = {
  isOpen: boolean;
  sectionId: string | null;
  question: any | null; // null if adding new, object if editing existing
};

export function QuestionBuilder({ examId }: { examId: string }) {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAiMode, setIsAiMode, isAddingSection, setIsAddingSection } = useExamBuilderStore();
  const [examDetail, setExamDetail] = useState<any>(null);
  const [aiTargetSectionId, setAiTargetSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!examId || examId === "new") {
      setLoading(false);
      return;
    }
    const fetchExam = async () => {
      try {
        const res = await getExamByIdService(examId);
        setExamDetail(res.data || res);
      } catch (error) {
        console.error("Failed to load exam details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    isOpen: false,
    sectionId: null,
    question: null
  });

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSidebar) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(350, Math.min(800, newWidth)));
    };
    const handleMouseUp = () => setIsDraggingSidebar(false);

    if (isDraggingSidebar) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };
  }, [isDraggingSidebar]);

  const fetchSections = async () => {
    try {
      const data = await getSectionsWithDetailsService(examId);
      setSections(data.data || []);
    } catch (error) {
      toast.error("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, [examId]);

  const handleSaveNewSection = async () => {
    if (!newSectionTitle.trim()) {
      toast.error("Section title is required");
      return;
    }
    try {
      await createSectionService({ examId, title: newSectionTitle });
      fetchSections();
      setNewSectionTitle("");
      setIsAddingSection(false);
      toast.success("Section added");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to add section");
    }
  };

  if (loading) return <div className="text-white text-center py-10">Loading builder...</div>;

  return (
    <div className="space-y-6 relative h-full">
      {isAiMode ? (
        <AiExamGeneratorForm
          examId={examId}
          examDetail={examDetail}
          existingSections={sections}
          existingSectionsCount={sections.length}
          initialTargetSectionId={aiTargetSectionId}
          onBack={() => {
            setAiTargetSectionId(null);
            setIsAiMode(false);
          }}
          onSuccess={() => {
            setAiTargetSectionId(null);
            setIsAiMode(false);
            fetchSections();
          }}
        />
      ) : isAddingSection ? (
        <Card className="bg-[#0f0f11] border-orange-500/50 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="p-4 flex items-center gap-4">
            <Input
              autoFocus
              placeholder="Enter section title..."
              value={newSectionTitle}
              onChange={e => setNewSectionTitle(e.target.value)}
              className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 h-10 flex-1 max-w-md"
              onKeyDown={(e) => e.key === "Enter" && handleSaveNewSection()}
            />
            <Button onClick={handleSaveNewSection} className="bg-green-600 hover:bg-green-700 text-white">Save Section</Button>
            <Button variant="ghost" onClick={() => setIsAddingSection(false)} className="text-gray-400 hover:text-white">Cancel</Button>
          </div>
        </Card>
      ) : sections.length === 0 ? (
        <div className="max-w-2xl mx-auto py-12 space-y-6">
          <h4 className="text-center text-lg font-bold text-white tracking-wide">How would you like to add questions?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#0f0f11] border-purple-500/20 hover:border-purple-500/50 hover:bg-[#151a28] cursor-pointer transition-all duration-300 p-6 flex flex-col items-center text-center space-y-4" onClick={() => setIsAiMode(true)}>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h5 className="font-bold text-white text-base">Create with AI</h5>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Instantly generate all exam sections, questions, multiple choices, and options using AI.
                </p>
              </div>
            </Card>

            <Card className="bg-[#0f0f11] border-white/5 hover:border-orange-500/30 hover:bg-[#151a28] cursor-pointer transition-all duration-300 p-6 flex flex-col items-center text-center space-y-4" onClick={() => setIsAddingSection(true)}>
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/30">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <h5 className="font-bold text-white text-base">Build Manually</h5>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Create your own custom sections, write questions, and set options manually from scratch.
                </p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-6 pb-20 relative">

          {/* Main List Area */}
          <div className="flex-1 space-y-8 transition-all duration-300 min-w-0">
            {sections.map((section, idx) => (
              <SectionItem
                key={section._id || section.id}
                section={section}
                index={idx}
                refresh={fetchSections}
                onOpenEditor={(q) => setEditorConfig({ isOpen: true, sectionId: section._id || section.id, question: q })}
                onOpenAiForSection={(secId) => {
                  setAiTargetSectionId(secId);
                  setIsAiMode(true);
                }}
              />
            ))}
          </div>

          {/* Resizable Splitter */}
          {editorConfig.isOpen && editorConfig.sectionId && (
            <div
              className="w-4 bg-transparent hover:bg-orange-500/20 active:bg-orange-500/40 cursor-col-resize shrink-0 transition-colors flex items-center justify-center group"
              onMouseDown={() => setIsDraggingSidebar(true)}
            >
              <div className="w-0.5 h-full min-h-[500px] bg-white/10 group-hover:bg-blue-400 rounded-full transition-colors" />
            </div>
          )}

          {/* Right Sidebar Editor */}
          {editorConfig.isOpen && editorConfig.sectionId && (
            <div
              className="shrink-0 sticky top-0 bg-[#151a28] border border-orange-500/30 rounded-xl shadow-[0_0_40px_rgba(147,51,234,0.15)] flex flex-col animate-in slide-in-from-right-8 h-[calc(100vh-250px)] overflow-hidden"
              style={{ width: `${sidebarWidth}px` }}
            >
              <SidebarQuestionEditor
                config={editorConfig}
                onClose={() => setEditorConfig({ isOpen: false, sectionId: null, question: null })}
                onSaveAndAnother={() => setEditorConfig({ isOpen: true, sectionId: editorConfig.sectionId, question: null })}
                refresh={fetchSections}
                examDetail={examDetail}
              />
            </div>
          )}

        </div>
      )}

    </div>
  );
}

// -------------------------------------------------------------
// SECTION COMPONENT
// -------------------------------------------------------------
function SectionItem({ section, index, refresh, onOpenEditor, onOpenAiForSection }: { section: any, index: number, refresh: () => void, onOpenEditor: (q: any) => void, onOpenAiForSection?: (secId: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [title, setTitle] = useState(section.title || "");
  const sectionId = section._id || section.id;

  const handleUpdate = async () => {
    try {
      await updateSectionService(sectionId, { title });
      setIsEditing(false);
      refresh();
      toast.success("Section updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update section");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this section? All questions inside will be lost.")) return;
    try {
      await deleteSectionService(sectionId);
      refresh();
      toast.success("Section deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete section");
    }
  };

  const handleQuickAdd = async (count: number) => {
    try {
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(createQuestionService({
          sectionId,
          type: "mcq",
          description: "New Multiple Choice Question - Click edit to modify",
          marks: 1,
          options: [
            { value: "Option A", isCorrect: true },
            { value: "Option B", isCorrect: false },
            { value: "Option C", isCorrect: false },
            { value: "Option D", isCorrect: false }
          ]
        }));
      }
      await Promise.all(promises);
      refresh();
      toast.success(`${count} empty question${count > 1 ? 's' : ''} added`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to quick add questions");
    }
  };

  return (
    <Card className="bg-[#0f0f11]/80 border-white/10 shadow-xl overflow-hidden transition-all duration-300">
      <div className="bg-[#18181b] px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex-1 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 -ml-2 text-gray-400 hover:text-white" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          <span className="text-orange-400 font-bold bg-orange-500/10 px-2.5 py-1 rounded">S{index + 1}</span>
          {isEditing ? (
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 h-9" onKeyDown={(e) => e.key === "Enter" && handleUpdate()} />
              <Button size="icon" variant="ghost" onClick={handleUpdate} className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-9 w-9"><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-9 w-9"><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <h4 className="text-lg font-bold text-white tracking-wide">{section.title}</h4>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="bg-transparent border-white/15 text-white hover:bg-white/10 h-8 px-3 text-xs font-semibold">
              Edit
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleDelete} className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs font-semibold">
            Delete
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-6 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
          {(section.questions || []).map((q: any, qIdx: number) => (
            <QuestionItem key={q._id || q.id} question={q} index={qIdx} refresh={refresh} onEdit={() => onOpenEditor(q)} />
          ))}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <Button onClick={() => onOpenEditor(null)} variant="outline" className="flex-1 bg-transparent border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-white/5 py-5 sm:py-6 text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-2" /> Custom Question
            </Button>

            <Button
              onClick={() => onOpenAiForSection && onOpenAiForSection(section._id || section.id)}
              variant="outline"
              className="flex-1 bg-purple-500/10 border-dashed border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/20 py-5 sm:py-6 font-bold text-xs sm:text-sm"
            >
              <Sparkles className="h-4 w-4 mr-2 text-purple-400" /> AI Add Questions
            </Button>

            <div className="flex-1 flex items-center bg-orange-500/10 border border-dashed border-orange-500/30 rounded-md overflow-hidden min-h-[44px]">
              <div className="px-2.5 py-2.5 text-xs text-orange-400 font-bold flex items-center border-r border-orange-500/30 whitespace-nowrap shrink-0">
                <Zap className="h-3.5 w-3.5 mr-1" /> Quick Add
              </div>
              <button onClick={() => handleQuickAdd(1)} className="flex-1 py-2.5 text-xs sm:text-sm text-orange-300 hover:bg-orange-500/20 hover:text-white transition-colors border-r border-orange-500/30 font-bold">+1</button>
              <button onClick={() => handleQuickAdd(5)} className="flex-1 py-2.5 text-xs sm:text-sm text-orange-300 hover:bg-orange-500/20 hover:text-white transition-colors border-r border-orange-500/30 font-bold">+5</button>
              <button onClick={() => handleQuickAdd(10)} className="flex-1 py-2.5 text-xs sm:text-sm text-orange-300 hover:bg-orange-500/20 hover:text-white transition-colors font-bold">+10</button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// -------------------------------------------------------------
// QUESTION COMPONENT
// -------------------------------------------------------------
function QuestionItem({ question, index, refresh, onEdit }: { question: any, index: number, refresh: () => void, onEdit: () => void }) {
  const questionId = question._id || question.id;

  const handleDelete = async () => {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQuestionService(questionId);
      refresh();
      toast.success("Question deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete question");
    }
  };

  return (
    <div className="bg-[#18181b]/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-sm hover:shadow-md hover:border-white/10 transition-all group">
      <div className="absolute top-0 left-0 bg-orange-500/10 text-orange-400 font-mono text-xs font-bold px-3 py-1.5 rounded-br-xl border-b border-r border-orange-500/30">
        Q{index + 1}
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button size="sm" variant="outline" className="bg-[#14151f] border-white/15 text-white hover:bg-white/10 h-8 px-3 text-xs font-semibold" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="outline" className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs font-semibold" onClick={handleDelete}>
          Delete
        </Button>
      </div>
      
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-4">
          <span className={cn(
            "px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider",
            question.type === 'mcq' ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" : "bg-[#18181b]mber-500/10 text-amber-400 border border-amber-500/20"
          )}>
            {question.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}
          </span>
          <span className="border border-white/10 bg-white/5 px-2.5 py-1 rounded-md text-gray-300 text-[10px] font-bold">Marks: {question.marks || 1}</span>
        </div>

        <div className="text-white text-[15px] leading-relaxed mb-6 font-medium prose prose-invert max-w-none pr-16">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({node, ...props}) => {
                const isInline = !props.className?.includes('language-');
                return isInline 
                  ? <code className="bg-orange-500/10 px-1.5 py-0.5 rounded text-[13px] text-orange-300 font-mono border border-orange-500/30" {...props} /> 
                  : (
                    <div className="my-5 rounded-xl overflow-hidden border border-white/10 bg-[#09090b] shadow-2xl">
                      <div className="bg-white/5 px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                        <span className="ml-3 text-xs font-mono text-gray-500 tracking-wider uppercase">{props.className?.replace('language-', '') || 'code'}</span>
                      </div>
                      <div className="p-5 overflow-x-auto custom-scrollbar">
                        <code className="block font-mono text-[13px] leading-relaxed text-gray-300" {...props} />
                      </div>
                    </div>
                  )
              },
              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
            }}
          >
            {question.description || question.question || question.text || "No question text provided."}
          </ReactMarkdown>
        </div>
        
        {question.images && question.images.length > 0 && (
          <div className="mt-4 mb-6">
            <img src={question.images[0].url} alt="Question figure" className="max-h-64 object-contain rounded-lg border border-white/10 bg-[#14151f] border-white/15 text-white placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30/50" />
          </div>
        )}

        {/* Display Read-Only Options */}
        {question.type === 'mcq' && question.options && question.options.length > 0 && (
          <div className="space-y-2.5 max-w-3xl">
            {question.options.map((opt: any, i: number) => (
              <div key={opt._id || opt.id} className={cn(
                "flex items-center p-3.5 rounded-xl border text-[14px] transition-all duration-200",
                opt.isCorrect 
                  ? "bg-green-500/10 border-green-500/30 text-green-300 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]"
                  : "bg-[#0f0f11] border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10"
              )}>
                {opt.isCorrect ? <CheckCircle2 className="h-4 w-4 mr-3.5 shrink-0 text-green-400" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-600 mr-3.5 shrink-0" />}
                <span className="font-medium">{opt.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// RIGHT SIDEBAR QUESTION EDITOR
// -------------------------------------------------------------
function SidebarQuestionEditor({ config, onClose, onSaveAndAnother, refresh, examDetail }: { config: EditorConfig, onClose: () => void, onSaveAndAnother: () => void, refresh: () => void, examDetail: any }) {
  const isEditMode = !!config.question;
  const questionId = isEditMode ? (config.question._id || config.question.id) : null;

  const [type, setType] = useState<"mcq" | "descriptive">(config.question?.type || "mcq");
  const [description, setDescription] = useState(config.question?.description || "");
  const [marks, setMarks] = useState(config.question?.marks?.toString() || "1");
  const [options, setOptions] = useState<any[]>(
    isEditMode && config.question?.options?.length > 0
      ? config.question.options
      : [
        { value: "", isCorrect: true },
        { value: "", isCorrect: false },
        { value: "", isCorrect: false },
        { value: "", isCorrect: false }
      ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(config.question?.images?.[0]?.url || null);
  
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSubject, setAiSubject] = useState(examDetail?.subject || examDetail?.title || "SQL");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [aiQuestionType, setAiQuestionType] = useState(type);
  const [aiMarks, setAiMarks] = useState(marks);
  const [aiTopic, setAiTopic] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if config changes (e.g. Save & Another clicked)
  useEffect(() => {
    setType(config.question?.type || "mcq");
    setDescription(config.question?.description || "");
    setMarks(config.question?.marks?.toString() || "1");
    setOptions(
      config.question?.options?.length > 0
        ? config.question.options
        : [
          { value: "", isCorrect: true },
          { value: "", isCorrect: false },
          { value: "", isCorrect: false },
          { value: "", isCorrect: false }
        ]
    );
    setImageFile(null);
    setImagePreview(config.question?.images?.[0]?.url || null);
    setShowAiModal(false);
    setAiSubject(examDetail?.subject || examDetail?.title || "");
    if (examDetail?.difficulty) setAiDifficulty(examDetail.difficulty.toLowerCase());
    setAiQuestionType(config.question?.type || "mcq");
    setAiMarks(config.question?.marks?.toString() || "1");
    setAiTopic("");
    setAiInstructions("");
  }, [config, examDetail]);

  const handleEditWithAi = async () => {
    if (!aiSubject.trim()) {
      toast.error("Subject is required");
      return;
    }
    setIsAiLoading(true);
    try {
      const specialInst = [
        description ? `Original description: "${description}"` : "",
        aiInstructions.trim()
      ].filter(Boolean).join("\n");

      const payload = {
        subject: aiSubject,
        difficulty: aiDifficulty.toLowerCase(),
        topic: aiTopic.trim() || "General",
        questionType: aiQuestionType,
        marks: Number(aiMarks) || 1,
        specialInstructions: specialInst
      };

      const res = await generateSingleQuestionService(payload);
      const generated = res.data || res;

      if (generated) {
        setDescription(generated.question_text || generated.description || "");
        setType(aiQuestionType);
        setMarks(aiMarks.toString());
        if (generated.type === "mcq" && generated.options) {
          const formattedOpts = generated.options.map((optVal: string, idx: number) => {
            const letter = ["A", "B", "C", "D"][idx];
            return {
              value: optVal,
              isCorrect: generated.correct_option === letter
            };
          });
          setOptions(formattedOpts);
        }
        toast.success("Question updated with AI!");
        setShowAiModal(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to edit question with AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleInsertCodeBlock = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const selectedText = description.substring(start, end);
    const beforeText = description.substring(0, start);
    const afterText = description.substring(end);
    
    const codeBlock = `\n\`\`\`python\n${selectedText || 'console.log("Hello World");'}\n\`\`\`\n`;
    
    const newDescription = beforeText + codeBlock + afterText;
    setDescription(newDescription);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 11, start + 11 + (selectedText.length || 27));
    }, 0);
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (description.trim().length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }

    let payloadOptions = undefined;
    if (type === "mcq") {
      const validOptions = options.filter(o => o.value.trim() !== "");
      if (validOptions.length < 2) {
        toast.error("MCQ requires at least 2 non-empty options");
        return;
      }
      if (!validOptions.some(o => o.isCorrect)) {
        toast.error("Please mark at least one option as correct");
        return;
      }
      // Map options to strip temp IDs if any
      payloadOptions = validOptions.map(o => ({ value: o.value, isCorrect: o.isCorrect, ...(o.id || o._id ? { id: o.id || o._id } : {}) }));
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      if (!isEditMode) formData.append("sectionId", config.sectionId!);
      if (!isEditMode) formData.append("type", type);
      formData.append("description", description);
      formData.append("marks", marks);
      if (type === "mcq" && payloadOptions) {
        formData.append("options", JSON.stringify(payloadOptions));
      }
      if (imageFile) {
        formData.append("images", imageFile);
      }

      if (isEditMode) {
        await updateQuestionService(questionId, formData);
        toast.success("Question updated successfully");
      } else {
        await createQuestionService(formData);
        toast.success("Question created successfully");
      }

      refresh();

      if (addAnother) {
        onSaveAndAnother();
      } else {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save question");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#18181b]">
        <h3 className="font-bold text-white text-lg">{isEditMode ? "Edit Question" : "New Question"}</h3>
        <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white h-8 w-8">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {!isEditMode && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Question Type</label>
            <Select value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger className="w-full bg-[#050505] border-white/10 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0f11] border-white/10 text-white">
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="descriptive">Descriptive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-300">Marks</label>
          <Input
            type="number"
            step="0.5"
            value={marks}
            onChange={e => setMarks(e.target.value)}
            className="w-full bg-[#050505] border-white/10 text-white h-11"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-300">Question Description</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAiModal(true)}
                className="h-7 text-xs bg-orange-500/10 border-orange-500/30 text-orange-400 hover:text-white hover:bg-orange-500/30 font-semibold"
              >
                Edit with AI
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleInsertCodeBlock}
                className="h-7 text-xs bg-orange-500/10 border-orange-500/30 text-orange-400 hover:text-white hover:bg-orange-500/30 font-semibold"
              >
                Make Code Block
              </Button>
            </div>
          </div>

          {/* Edit Question with AI Dialog */}
          <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
            <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-lg rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-white text-xl font-bold">
                  Edit Question with AI
                </DialogTitle>
              </DialogHeader>

              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                  <p className="text-sm text-gray-400 text-center">Our AI agent is generating the updated question. This may take a few seconds...</p>
                </div>
              ) : (
                <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">Subject</label>
                    <Input
                      type="text"
                      placeholder="e.g. SQL, JavaScript"
                      value={aiSubject}
                      onChange={(e) => setAiSubject(e.target.value)}
                      className="bg-[#14151f] border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-400 focus:outline-none focus:border-white/30 text-sm h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-300">Difficulty</label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full bg-[#14151f] border border-white/15 text-white rounded-xl h-11 px-3.5 focus:outline-none focus:border-white/30 text-sm"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-300">Question Type</label>
                      <select
                        value={aiQuestionType}
                        onChange={(e) => setAiQuestionType(e.target.value as "mcq" | "descriptive")}
                        className="w-full bg-[#14151f] border border-white/15 text-white rounded-xl h-11 px-3.5 focus:outline-none focus:border-white/30 text-sm"
                      >
                        <option value="mcq">MCQ</option>
                        <option value="descriptive">Descriptive</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-300">Marks</label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={aiMarks}
                        onChange={(e) => setAiMarks(e.target.value)}
                        className="bg-[#14151f] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white/30 text-sm h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">Topic</label>
                    <Input
                      type="text"
                      placeholder="e.g. Variables"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="bg-[#14151f] border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-400 focus:outline-none focus:border-white/30 text-sm h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">Special Instructions (optional)</label>
                    <Textarea
                      placeholder="e.g. Include scenario-based real-world application questions"
                      value={aiInstructions}
                      onChange={(e) => setAiInstructions(e.target.value)}
                      rows={2}
                      className="bg-[#14151f] border border-white/15 rounded-xl p-3 text-white placeholder:text-zinc-400 focus:outline-none focus:border-white/30 text-sm resize-none"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="bg-transparent border-0 p-0 mt-4 flex items-center justify-end gap-3">
                <Button variant="ghost" className="text-gray-300 hover:text-white font-semibold" onClick={() => setShowAiModal(false)} disabled={isAiLoading}>
                  Cancel
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl px-6 h-11 shadow-lg shadow-orange-950/40" onClick={handleEditWithAi} disabled={isAiLoading}>
                  Generate & Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Textarea
            ref={textareaRef}
            placeholder="Enter question text here..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 min-h-[140px] font-mono text-[13px]"
          />
          <p className="text-xs text-gray-500 text-right">{description.length} chars (min 10)</p>
        </div>

        {/* Image Upload Area */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-300">Question Image (Optional)</label>
          {imagePreview ? (
            <div className="relative inline-block border border-white/10 rounded-lg overflow-hidden bg-[#14151f] border-white/15 text-white placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30/50">
              <img src={imagePreview} alt="Question preview" className="max-h-48 object-contain" />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={removeImage}
                className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-white/10 border-dashed rounded-lg cursor-pointer bg-[#050505] hover:bg-white/5 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-6 h-6 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                  </svg>
                  <p className="mb-2 text-xs text-gray-400"><span className="font-semibold">Click to upload image</span></p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>
          )}
        </div>

        {type === "mcq" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-300">Options</label>
              <span className="text-[10px] text-gray-500 uppercase">Select correct answers</span>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className={cn("flex items-center gap-3 p-2 rounded-lg border transition-all", opt.isCorrect ? "bg-green-500/5 border-green-500/30" : "bg-[#050505] border-white/5")}>
                  <button onClick={() => {
                    const newOpts = [...options];
                    newOpts[i].isCorrect = !newOpts[i].isCorrect;
                    setOptions(newOpts);
                  }} className="shrink-0 p-1">
                    {opt.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600 hover:text-white" />}
                  </button>
                  <Input
                    value={opt.value}
                    onChange={e => {
                      const newOpts = [...options];
                      newOpts[i].value = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="bg-transparent border-none text-white h-8 shadow-none focus-visible:ring-0 p-0 text-sm"
                  />
                  {options.length > 2 && (
                    <Button size="icon" variant="ghost" onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="h-7 w-7 text-gray-500 hover:text-red-400 shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 5 && (
              <Button size="sm" variant="outline" onClick={() => setOptions([...options, { value: "", isCorrect: false }])} className="w-full bg-transparent border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/5 mt-2">
                <Plus className="h-4 w-4 mr-2" /> Add Another Option
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-[#18181b] space-y-3 shrink-0">
        <Button onClick={() => handleSave(false)} disabled={isSaving} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-950/40">
          {isSaving ? "Saving..." : "Save Question"}
        </Button>
        {!isEditMode && (
          <Button onClick={() => handleSave(true)} disabled={isSaving} variant="outline" className="w-full bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
            Save & Add Another
          </Button>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// AI EXAM GENERATOR FORM
// -------------------------------------------------------------
function AiExamGeneratorForm({ examId, examDetail, existingSections = [], existingSectionsCount = 0, initialTargetSectionId = null, onBack, onSuccess }: { examId: string, examDetail?: any, existingSections?: any[], existingSectionsCount?: number, initialTargetSectionId?: string | null, onBack: () => void, onSuccess: () => void }) {
  const [difficulty, setDifficulty] = useState(
    examDetail?.difficulty 
      ? examDetail.difficulty.charAt(0).toUpperCase() + examDetail.difficulty.slice(1).toLowerCase() 
      : "Medium"
  );
  const [instructions, setInstructions] = useState<string[]>(
    examDetail?.specialInstructions && examDetail.specialInstructions.trim() !== ""
      ? [examDetail.specialInstructions]
: [""]
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");

  // 3-Stage Workflow States
  const [aiStage, setAiStage] = useState<"config" | "blueprint">("config");
  const [blueprint, setBlueprint] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Sync state if examDetail is loaded or updated asynchronously
  useEffect(() => {
    if (examDetail) {
      if (examDetail.difficulty) {
        const capitalized = examDetail.difficulty.charAt(0).toUpperCase() + examDetail.difficulty.slice(1).toLowerCase();
        setDifficulty(capitalized);
      }
      if (examDetail.specialInstructions && examDetail.specialInstructions.trim() !== "") {
        setInstructions([examDetail.specialInstructions]);
      }
    }
  }, [examDetail]);

  const addInstruction = () => {
    setInstructions(prev => [...prev, ""]);
  };

  const removeInstruction = (idx: number) => {
    setInstructions(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0 ? [""] : next;
    });
  };

  const updateInstruction = (idx: number, val: string) => {
    setInstructions(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const [sections, setSections] = useState<any[]>([
    {
      id: Date.now().toString(),
      name: `Section ${String.fromCharCode(65 + existingSectionsCount)}`,
      targetSectionId: initialTargetSectionId || null,
      blocks: [
        {
          id: Date.now().toString() + "-b0",
          name: "Block 1",
          subject: "",
          topics: [""],
          questionType: "mcq",
          numberOfQuestions: "5",
          marksPerQuestion: "1"
        }
      ]
    }
  ]);

  const addSection = () => {
    setSections(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: `Section ${String.fromCharCode(65 + existingSectionsCount + prev.length)}`,
        targetSectionId: null,
        blocks: [
          {
            id: Date.now().toString() + "-b0",
            name: "Block 1",
            subject: "",
            topics: [""],
            questionType: "mcq",
            numberOfQuestions: "5",
            marksPerQuestion: "1"
          }
        ]
      }
    ]);
  };

  const removeSection = (id: string) => {
    if (sections.length === 1) {
      toast.error("You must have at least one section");
      return;
    }
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: string, value: any) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addBlockToSection = (sectionId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      blocks: [...s.blocks, {
        id: Date.now().toString() + "-b" + s.blocks.length,
        name: `Block ${s.blocks.length + 1}`,
        subject: "",
        topics: [""],
        questionType: "mcq",
        numberOfQuestions: "5",
        marksPerQuestion: "1"
      }]
    } : s));
  };

  const removeBlockFromSection = (sectionId: string, bIdx: number) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      if (s.blocks.length <= 1) return s;
      const nextBlocks = s.blocks.filter((_: any, i: number) => i !== bIdx);
      return { ...s, blocks: nextBlocks };
    }));
  };

  const updateBlock = (sectionId: string, bIdx: number, field: string, value: any) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      blocks: s.blocks.map((b: any, i: number) => i === bIdx ? { ...b, [field]: value } : b)
    } : s));
  };

  const addTopicToBlock = (sectionId: string, bIdx: number) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      blocks: s.blocks.map((b: any, i: number) => i === bIdx ? { ...b, topics: [...b.topics, ""] } : b)
    } : s));
  };

  const removeTopicFromBlock = (sectionId: string, bIdx: number, idx: number) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        blocks: s.blocks.map((b: any, i: number) => {
          if (i !== bIdx) return b;
          const nextTopics = b.topics.filter((_: string, j: number) => j !== idx);
          return { ...b, topics: nextTopics.length === 0 ? [""] : nextTopics };
        })
      };
    }));
  };

  const updateTopicInBlock = (sectionId: string, bIdx: number, idx: number, val: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        blocks: s.blocks.map((b: any, i: number) => {
          if (i !== bIdx) return b;
          const nextTopics = [...b.topics];
          nextTopics[idx] = val;
          return { ...b, topics: nextTopics };
        })
      };
    }));
  };

  // Step 1: Generate Blueprint Tree
  const handleGenerateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = sections.some(s => {
      if (!s.name.trim()) return true;
      return !s.blocks.some((b: any) => b.subject.trim() && b.topics.filter((t: string) => t.trim() !== "").length > 0 && Number(b.numberOfQuestions) > 0);
    });
    if (invalid) {
      toast.error("Please fill in each block's subject, topics, and question counts");
      return;
    }

    setIsGenerating(true);
    setGeneratingMessage("Subtopics Agent is planning blueprint tree & allocating questions...");
    try {
      const payload = {
        title: `${(sections[0]?.blocks?.[0]?.subject?.trim() || "Untitled")} Exam`,
        difficulty: (difficulty || "medium").toLowerCase(),
        instructions: instructions.map(i => i.trim()).filter(i => i !== ""),
        sections: sections.map(s => ({
          name: s.name.trim(),
          blocks: s.blocks.map((b: any) => {
            const qCount = Math.max(1, Math.round(Number(b.numberOfQuestions) || 5));
            const marks = Math.max(1, Math.round(qCount * (Number(b.marksPerQuestion) || 1)));
            return {
              name: (b.name || "Block").trim(),
              subject: b.subject.trim(),
              question_type: (b.questionType || "mcq").toLowerCase(),
              question_count: qCount,
              total_marks: marks,
              topics: b.topics.map((t: string) => t.trim()).filter((t: string) => t !== "")
            };
          })
        }))
      };

      const res = await generateBlueprintService(payload);
      const bp = res.data || res;
      setBlueprint(bp);
      setAiStage("blueprint");
      toast.success("Blueprint tree created! Inspect and customize blocks, topics and questions below.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to generate blueprint");
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2: Verify Blueprint Tree
  const handleVerifyAndProceed = async () => {
    if (!blueprint) return;

    setIsVerifying(true);
    try {
      const res = await verifyBlueprintService(blueprint);
      const result = res.data || res;
      setVerificationResult(result);

      if (result.isValid && (!result.warnings || result.warnings.length === 0)) {
        toast.success("Verification passed with 0 semantic issues!");
        await executeFinalGeneration(blueprint);
      } else {
        setShowVerificationModal(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3: Apply AI Suggestions to Blueprint
  const handleApplySuggestionsAndProceed = async () => {
    if (!blueprint || !verificationResult || !verificationResult.warnings) return;

    const updatedBp = JSON.parse(JSON.stringify(blueprint));

    // Capture each section's total question count BEFORE any changes so we can
    // restore it after moving subtopics (prevents the "asked 5, got 6" inflation).
    const sectionTotals = (updatedBp.sections || []).map((sec: any) =>
      (sec.blocks || []).reduce((bs: number, block: any) =>
        bs + (block.topics || []).reduce((sum: number, top: any) =>
          sum + (top.subtopics || []).reduce((s: number, st: any) => s + (st.allocatedQuestions || 0), 0), 0), 0)
    );

    verificationResult.warnings.forEach((warn: any) => {
      if (!warn.suggestedTopic) return;
      (updatedBp.sections || []).forEach((sec: any) => {
        // Relocate the flagged subtopic, preserving its original allocated count.
        let movedAllocation = 1;
        for (const block of sec.blocks || []) {
          for (const top of block.topics || []) {
            const found = (top.subtopics || []).find((st: any) => st.name.toLowerCase() === (warn.subtopic || "").toLowerCase());
            if (found) {
              movedAllocation = found.allocatedQuestions || 1;
              top.subtopics = top.subtopics.filter((st: any) => st.name.toLowerCase() !== (warn.subtopic || "").toLowerCase());
              break;
            }
          }
          if (movedAllocation !== 1 || block.topics.some((t: any) => (t.subtopics || []).some((st: any) => st.name.toLowerCase() === (warn.subtopic || "").toLowerCase()))) break;
        }
        let targetTopicObj: any = null;
        for (const block of sec.blocks || []) {
          targetTopicObj = block.topics.find((t: any) => t.topic.toLowerCase() === (warn.suggestedTopic || "").toLowerCase());
          if (targetTopicObj) {
            targetTopicObj.subtopics.push({ name: warn.subtopic, allocatedQuestions: movedAllocation });
            break;
          }
        }
        if (!targetTopicObj) {
          const firstBlock = sec.blocks?.[0];
          if (firstBlock) {
            const newTopic = { topic: warn.suggestedTopic, subtopics: [{ name: warn.subtopic, allocatedQuestions: movedAllocation }] };
            firstBlock.topics.push(newTopic);
          }
        }
      });
    });

    // Rebalance each section so the total allocated questions equals the original total.
    const redistribute = (subtopics: any[], target: number) => {
      if (!subtopics.length || target < 1) return;
      const totalW = subtopics.reduce((s, st) => s + (st.weight ?? st.allocatedQuestions ?? 1), 0) || subtopics.length;
      const exact = subtopics.map((st) => ((st.weight ?? st.allocatedQuestions ?? 1) / totalW) * target);
      const counts = exact.map(Math.floor);
      let used = counts.reduce((s, c) => s + c, 0);
      const order = exact.map((e, i) => ({ i, r: e - counts[i] })).sort((a, b) => b.r - a.r);
      let k = 0;
      while (used < target) { counts[order[k % order.length].i]++; used++; k++; }
      subtopics.forEach((_, i) => { counts[i] = Math.max(1, counts[i]); });
      let sum = counts.reduce((s, c) => s + c, 0);
      if (sum > target) {
        const byWeight = exact.map((e, i) => ({ i, w: e })).sort((a, b) => a.w - b.w);
        for (const o of byWeight) {
          if (sum <= target) break;
          if (counts[o.i] > 1) { counts[o.i]--; sum--; }
        }
      }
      subtopics.forEach((st, i) => { st.allocatedQuestions = counts[i]; });
    };

    (updatedBp.sections || []).forEach((sec: any, sIdx: number) => {
      const targetTotal = Math.max(1, sectionTotals[sIdx] || 1);
      const subtopics: any[] = [];
      for (const block of sec.blocks || []) {
        for (const top of block.topics || []) {
          for (const st of top.subtopics || []) {
            subtopics.push({ ...st });
          }
        }
      }
      if (subtopics.length === 0) return;
      const currentTotal = subtopics.reduce((s, st) => s + (st.allocatedQuestions || 0), 0);
      if (currentTotal === targetTotal) return;
      redistribute(subtopics, targetTotal);
      let idx = 0;
      for (const block of sec.blocks || []) {
        for (const top of block.topics || []) {
          for (let j = 0; j < (top.subtopics || []).length; j++) {
            top.subtopics[j].allocatedQuestions = subtopics[idx]?.allocatedQuestions ?? 1;
            idx++;
          }
        }
      }
    });

    setBlueprint(updatedBp);
    setShowVerificationModal(false);
    toast.success("AI suggestions applied to blueprint tree!");
    await executeFinalGeneration(updatedBp);
  };

  // Final Step: Enqueue generation job, poll for result, save generated exam
  const executeFinalGeneration = async (bpToUse: any) => {
    setIsGenerating(true);
    setGeneratingMessage("Submitting generation job...");
    try {
      const enqueueRes = await enqueueGenerateFromBlueprintService(bpToUse);
      const jobId = enqueueRes.data?.jobId || enqueueRes.jobId;
      if (!jobId) throw new Error("No generation job id returned");

      setGeneratingMessage("RAG search & question generation in progress...");

      let generatedExam: any = null;
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const jobRes = await getGenerationJobService(jobId);
        const job = jobRes.data || jobRes;

        if (job.status === "completed") {
          generatedExam = job.result;
          break;
        }
        if (job.status === "failed") {
          throw new Error(job.error || "Question generation failed");
        }
      }

      if (!generatedExam) throw new Error("Generation job returned no result");

      setGeneratingMessage("Saving generated questions into exam...");
      await saveGeneratedExamService({
        ...generatedExam,
        examId,
        status: "PUBLISHED",
      });

      toast.success("Exam questions generated & saved successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating || isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-500/20 rounded-full flex items-center justify-center">
            <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
            <Sparkles className="h-7 w-7 text-purple-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h4 className="text-xl font-bold text-white">
            {isVerifying ? "Verification Agent is checking blueprint..." : "AI Agent is generating questions..."}
          </h4>
          <p className="text-sm text-purple-300/80 animate-pulse">{generatingMessage}</p>
        </div>
        <p className="text-xs text-gray-500 max-w-sm text-center">
          Please wait. This ensures topic relevance, question allocations, and RAG context accuracy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 animate-in fade-in slide-in-from-bottom-1 duration-150 w-full max-w-full px-2 pb-6">

      {aiStage === "blueprint" && blueprint ? (
        /* STAGE 2: INTERACTIVE BLUEPRINT TREE VIEW */
        <div className="space-y-6">
          <BlueprintTreeViewer blueprint={blueprint} onChange={setBlueprint} />

          {/* Action Bar for Blueprint Tree */}
          <div className="sticky bottom-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 p-4 rounded-t-2xl shadow-2xl flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => setAiStage("config")}
              className="text-gray-400 hover:text-white h-10 px-5 text-sm font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Edit Exam Settings
            </Button>

            <Button
              onClick={handleVerifyAndProceed}
              disabled={isVerifying}
              className="bg-purple-600 hover:bg-purple-700 text-white h-11 px-7 font-bold text-sm shadow-xl shadow-purple-950/40 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4 mr-2 text-purple-200" /> Verify & Generate Questions
            </Button>
          </div>
        </div>
      ) : (
        /* STAGE 1: INITIAL EXAM CONFIG FORM */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full">
          
          {/* BOX 1 (LEFT): EXAM SETTINGS */}
          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h5 className="font-bold text-white text-base tracking-wider uppercase">EXAM SETTINGS</h5>
                <p className="text-xs text-gray-400">Configure basic parameters to generate AI topic blueprint</p>
              </div>

              {/* DIFFICULTY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">DIFFICULTY *</label>
                  <Select value={difficulty} onValueChange={val => setDifficulty(val || "Medium")}>
                    <SelectTrigger className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 h-11 text-sm focus:ring-orange-500 rounded-xl px-3.5">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-orange-400 shrink-0" />
                        <SelectValue placeholder="Select Difficulty" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#14151f] border border-white/15 text-white text-sm min-w-[200px] shadow-2xl z-50">
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SPECIAL INSTRUCTIONS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">SPECIAL INSTRUCTIONS</label>
                  <Button
                    type="button"
                    onClick={addInstruction}
                    variant="ghost"
                    className="h-5 px-0 text-xs text-orange-400 hover:text-orange-300 bg-transparent"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {instructions.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={inst}
                        onChange={e => updateInstruction(idx, e.target.value)}
                        placeholder={`Instruction ${idx + 1}...`}
                        className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 h-10 text-xs rounded-xl focus-visible:ring-orange-500"
                      />
                      {instructions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInstruction(idx)}
                          className="text-gray-400 hover:text-red-400 transition-colors p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOX 2 (RIGHT): SECTIONS & TOPICS CONFIG */}
          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h5 className="font-bold text-white text-base tracking-wider uppercase">SECTIONS & TOPICS</h5>
                  <p className="text-xs text-gray-400">Organize your initial section topics for blueprint planning</p>
                </div>
                <Button
                  type="button"
                  onClick={addSection}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-orange-950/40 h-9 px-4"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Section
                </Button>
              </div>

              <div className="space-y-6">
                {sections.map((section, idx) => (
                  <div key={section.id} className="space-y-4 pt-2 first:pt-0">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <Input
                        value={section.name}
                        onChange={e => updateSection(section.id, 'name', e.target.value)}
                        className="bg-transparent border-none text-white text-base font-bold h-8 focus-visible:ring-0 p-0 focus:outline-none"
                        placeholder="Section Name"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSection(section.id)}
                        className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 h-8 px-2.5 text-xs font-semibold shrink-0"
                      >
                        Remove
                      </Button>
                    </div>

                    {/* BLOCKS */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">BLOCKS (subject-scoped)</label>
                        <Button
                          type="button"
                          onClick={() => addBlockToSection(section.id)}
                          variant="ghost"
                          className="h-5 px-0 text-xs text-purple-400 hover:text-purple-300 bg-transparent"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Block
                        </Button>
                      </div>

                      {section.blocks.map((block: any, bIdx: number) => (
                        <div key={block.id} className="bg-[#14151f] border border-purple-500/20 rounded-xl p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-purple-400 text-xs font-bold">▣</span>
                              <Input
                                value={block.name}
                                onChange={e => updateBlock(section.id, bIdx, 'name', e.target.value)}
                                placeholder="Block name"
                                className="bg-[#0b0c10] border border-white/10 text-white text-xs font-bold h-8 w-32 focus-visible:ring-purple-500"
                              />
                              <Input
                                value={block.subject}
                                onChange={e => updateBlock(section.id, bIdx, 'subject', e.target.value)}
                                placeholder="Subject (e.g. JavaScript)"
                                className="bg-[#0b0c10] border border-white/10 text-white text-xs font-bold h-8 flex-1 focus-visible:ring-purple-500"
                                required
                              />
                            </div>
                            {section.blocks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBlockFromSection(section.id, bIdx)}
                                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {/* BLOCK TOPICS */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">TOPICS</label>
                              <Button
                                type="button"
                                onClick={() => addTopicToBlock(section.id, bIdx)}
                                variant="ghost"
                                className="h-5 px-0 text-[11px] text-orange-400 hover:text-orange-300 bg-transparent"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Topic
                              </Button>
                            </div>
                            <div className="space-y-1.5">
                              {block.topics.map((topic: string, tIdx: number) => (
                                <div key={tIdx} className="flex items-center justify-between gap-2 bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-1.5">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-orange-400 text-xs font-bold">•</span>
                                    <Input
                                      value={topic}
                                      onChange={e => updateTopicInBlock(section.id, bIdx, tIdx, e.target.value)}
                                      placeholder={`Topic ${tIdx + 1}`}
                                      className="bg-transparent border-none text-white text-xs h-8 focus-visible:ring-0 p-0 flex-1 focus:outline-none"
                                      required
                                    />
                                  </div>
                                  {block.topics.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeTopicFromBlock(section.id, bIdx, tIdx)}
                                      className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* TYPE, QUESTIONS, MARKS EACH */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">TYPE</label>
                              <Select value={block.questionType} onValueChange={val => updateBlock(section.id, bIdx, 'questionType', val)}>
                                <SelectTrigger className="bg-[#0b0c10] border border-white/10 text-white h-9 text-xs font-semibold rounded-lg px-2.5">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#14151f] border border-white/15 text-white text-xs">
                                  <SelectItem value="mcq">MCQ</SelectItem>
                                  <SelectItem value="descriptive">Descriptive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">QUESTIONS</label>
                              <Input
                                type="number"
                                min="1"
                                max="50"
                                value={block.numberOfQuestions}
                                onChange={e => updateBlock(section.id, bIdx, 'numberOfQuestions', e.target.value)}
                                className="bg-[#0b0c10] border border-white/10 text-white h-9 text-xs font-bold rounded-lg text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">MARKS EACH</label>
                              <Input
                                type="number"
                                min="1"
                                value={block.marksPerQuestion}
                                onChange={e => updateBlock(section.id, bIdx, 'marksPerQuestion', e.target.value)}
                                className="bg-[#0b0c10] border border-white/10 text-white h-9 text-xs font-bold rounded-lg text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* STAGE 1 BOTTOM ACTION BAR */}
      {aiStage === "config" && (
        <div className="sticky bottom-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 p-4 rounded-t-2xl shadow-2xl flex items-center justify-between gap-4 -mx-1 mt-6">
          <Button variant="ghost" onClick={onBack} className="text-gray-400 hover:text-white h-10 px-5 text-sm font-semibold flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={handleGenerateBlueprint} className="bg-purple-600 hover:bg-purple-700 text-white h-11 px-7 font-bold text-sm shadow-xl shadow-purple-950/40 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Sparkles className="h-4 w-4 mr-2 text-purple-200" /> Generate Blueprint Tree
          </Button>
        </div>
      )}

      {/* VERIFICATION AGENT WARNINGS MODAL */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" /> Verification Agent Blueprint Analysis
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {verificationResult?.overallFeedback && (
              <p className="text-xs text-zinc-300 bg-[#14151f] border border-white/10 p-3 rounded-xl">
                {verificationResult.overallFeedback}
              </p>
            )}

            <div className="space-y-3">
              <h6 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Semantic Warnings & Suggested Corrections ({verificationResult?.warnings?.length || 0})
              </h6>

              {(verificationResult?.warnings || []).map((warn: any, idx: number) => (
                <div key={idx} className="bg-[#14151f] border border-amber-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="text-amber-400">Topic: {warn.topic}</span>
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px]">
                      Subtopic: {warn.subtopic}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{warn.reason}</p>
                  {warn.suggestedTopic && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg font-medium">
                      💡 Suggested Parent Topic: <span className="font-bold underline">{warn.suggestedTopic}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setShowVerificationModal(false)}
              className="bg-transparent border-white/15 text-zinc-300 hover:text-white"
            >
              Edit Blueprint
            </Button>

            {verificationResult?.warnings?.some((w: any) => w.suggestedTopic) && (
              <Button
                onClick={handleApplySuggestionsAndProceed}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Apply AI Suggestions & Proceed
              </Button>
            )}

            <Button
              onClick={() => {
                setShowVerificationModal(false);
                if (blueprint) executeFinalGeneration(blueprint);
              }}
              variant="outline"
              className="bg-orange-600/20 border-orange-500/40 text-orange-400 hover:bg-orange-600 hover:text-white font-semibold"
            >
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
