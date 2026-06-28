"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit2, Check, X, CheckCircle2, Circle, Settings2, Zap, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  createSectionService, getSectionsWithDetailsService, updateSectionService, deleteSectionService,
  createQuestionService, updateQuestionService, deleteQuestionService,
  createOptionService, updateOptionService, deleteOptionService
} from "../exam.service";

export type EditorConfig = {
  isOpen: boolean;
  sectionId: string | null;
  question: any | null; // null if adding new, object if editing existing
};

export function QuestionBuilder({ examId }: { examId: string }) {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddingSection, setIsAddingSection] = useState(false);
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
      // Calculate width from the right edge of the screen
      // Assuming the sidebar is anchored to the right, new width is window width - mouseX
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
      <div className="flex items-center justify-between bg-[#111520]/80 p-5 rounded-xl border border-white/5">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Question Builder</h3>
          <p className="text-sm text-gray-400">Manage sections, questions, and multiple choices.</p>
        </div>
        {!isAddingSection && (
          <Button onClick={() => setIsAddingSection(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-900/50">
            <Plus className="h-4 w-4 mr-2" /> Add Section
          </Button>
        )}
      </div>

      {isAddingSection && (
        <Card className="bg-[#111520] border-purple-500/50 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="p-4 flex items-center gap-4">
            <Input
              autoFocus
              placeholder="Enter section title..."
              value={newSectionTitle}
              onChange={e => setNewSectionTitle(e.target.value)}
              className="bg-[#0b0f19] border-white/10 text-white h-10 flex-1 max-w-md"
              onKeyDown={(e) => e.key === "Enter" && handleSaveNewSection()}
            />
            <Button onClick={handleSaveNewSection} className="bg-green-600 hover:bg-green-700 text-white">Save Section</Button>
            <Button variant="ghost" onClick={() => setIsAddingSection(false)} className="text-gray-400 hover:text-white">Cancel</Button>
          </div>
        </Card>
      )}

      {sections.length === 0 && !isAddingSection ? (
        <Card className="bg-[#111520]/50 border-white/5 text-center py-16">
          <CardContent className="text-gray-400 flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-gray-500" />
            </div>
            <p>No sections yet. Click "Add Section" to begin.</p>
          </CardContent>
        </Card>
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
              />
            ))}
          </div>

          {/* Resizable Splitter */}
          {editorConfig.isOpen && editorConfig.sectionId && (
            <div
              className="w-4 bg-transparent hover:bg-purple-500/20 active:bg-purple-500/40 cursor-col-resize shrink-0 transition-colors flex items-center justify-center group"
              onMouseDown={() => setIsDraggingSidebar(true)}
            >
              <div className="w-0.5 h-full min-h-[500px] bg-white/10 group-hover:bg-purple-400 rounded-full transition-colors" />
            </div>
          )}

          {/* Right Sidebar Editor */}
          {editorConfig.isOpen && editorConfig.sectionId && (
            <div
              className="shrink-0 sticky top-0 bg-[#151a28] border border-purple-500/40 rounded-xl shadow-[0_0_40px_rgba(147,51,234,0.15)] flex flex-col animate-in slide-in-from-right-8 h-[calc(100vh-250px)] overflow-hidden"
              style={{ width: `${sidebarWidth}px` }}
            >
              <SidebarQuestionEditor
                config={editorConfig}
                onClose={() => setEditorConfig({ isOpen: false, sectionId: null, question: null })}
                onSaveAndAnother={() => setEditorConfig({ isOpen: true, sectionId: editorConfig.sectionId, question: null })}
                refresh={fetchSections}
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
function SectionItem({ section, index, refresh, onOpenEditor }: { section: any, index: number, refresh: () => void, onOpenEditor: (q: any) => void }) {
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
    <Card className="bg-[#111520]/80 border-white/10 shadow-xl overflow-hidden transition-all duration-300">
      <div className="bg-[#1a1f2e] px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex-1 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 -ml-2 text-gray-400 hover:text-white" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          <span className="text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded">S{index + 1}</span>
          {isEditing ? (
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} className="bg-[#0b0f19] border-white/10 text-white h-9" onKeyDown={(e) => e.key === "Enter" && handleUpdate()} />
              <Button size="icon" variant="ghost" onClick={handleUpdate} className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-9 w-9"><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-9 w-9"><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <h4 className="text-lg font-bold text-white tracking-wide">{section.title}</h4>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white">
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-6 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
          {(section.questions || []).map((q: any, qIdx: number) => (
            <QuestionItem key={q._id || q.id} question={q} index={qIdx} refresh={refresh} onEdit={() => onOpenEditor(q)} />
          ))}

          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => onOpenEditor(null)} variant="outline" className="flex-1 min-w-[180px] bg-transparent border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-white/5 py-6">
              <Plus className="h-4 w-4 mr-2" /> Custom Question
            </Button>
            <div className="flex-1 min-w-[250px] flex items-center bg-purple-500/10 border border-dashed border-purple-500/30 rounded-md overflow-hidden">
              <div className="px-3 py-3 text-[13px] text-purple-400 font-bold flex items-center border-r border-purple-500/30 whitespace-nowrap">
                <Zap className="h-4 w-4 mr-1.5" /> Quick Add
              </div>
              <button onClick={() => handleQuickAdd(1)} className="flex-1 py-3 text-sm text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors border-r border-purple-500/30 font-bold">+1</button>
              <button onClick={() => handleQuickAdd(5)} className="flex-1 py-3 text-sm text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors border-r border-purple-500/30 font-bold">+5</button>
              <button onClick={() => handleQuickAdd(10)} className="flex-1 py-3 text-sm text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors font-bold">+10</button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// -------------------------------------------------------------
// QUESTION ITEM COMPONENT (Read Only View)
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
    <div className="bg-[#1a1f2e]/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-sm hover:shadow-md hover:border-white/10 transition-all group">
      <div className="absolute top-0 left-0 bg-purple-500/10 text-purple-400 font-mono text-xs font-bold px-3 py-1.5 rounded-br-xl border-b border-r border-purple-500/20">
        Q{index + 1}
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white bg-[#0b0f19]/50 hover:bg-[#0b0f19]" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-4">
          <span className={cn(
            "px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider",
            question.type === 'mcq' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
                  ? <code className="bg-purple-500/10 px-1.5 py-0.5 rounded text-[13px] text-purple-300 font-mono border border-purple-500/20" {...props} /> 
                  : (
                    <div className="my-5 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-2xl">
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
            <img src={question.images[0].url} alt="Question figure" className="max-h-64 object-contain rounded-lg border border-white/10 bg-black/50" />
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
                  : "bg-[#111520] border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10"
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
function SidebarQuestionEditor({ config, onClose, onSaveAndAnother, refresh }: { config: EditorConfig, onClose: () => void, onSaveAndAnother: () => void, refresh: () => void }) {
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
  }, [config]);

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
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#1a1f2e]">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-1.5 rounded text-white">
            <Settings2 className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white">{isEditMode ? "Edit Question" : "New Question"}</h3>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white h-8 w-8">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {!isEditMode && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Question Type</label>
            <Select value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger className="w-full bg-[#0b0f19] border-white/10 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111520] border-white/10 text-white">
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
            className="w-full bg-[#0b0f19] border-white/10 text-white h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-300">Question Description</label>
          <Textarea
            placeholder="Enter question text here..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-[#0b0f19] border-white/10 text-white min-h-[140px]"
          />
          <p className="text-xs text-gray-500 text-right">{description.length} chars (min 10)</p>
        </div>

        {/* Image Upload Area */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-300">Question Image (Optional)</label>
          {imagePreview ? (
            <div className="relative inline-block border border-white/10 rounded-lg overflow-hidden bg-black/50">
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
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-white/10 border-dashed rounded-lg cursor-pointer bg-[#0b0f19] hover:bg-white/5 transition-colors">
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
                <div key={i} className={cn("flex items-center gap-3 p-2 rounded-lg border transition-all", opt.isCorrect ? "bg-green-500/5 border-green-500/30" : "bg-[#0b0f19] border-white/5")}>
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

      <div className="p-6 border-t border-white/5 bg-[#1a1f2e] space-y-3 shrink-0">
        <Button onClick={() => handleSave(false)} disabled={isSaving} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-900/50">
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
