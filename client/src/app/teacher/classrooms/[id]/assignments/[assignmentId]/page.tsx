"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Pencil, ListChecks, X, Check, Eye, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getAssignmentByIdService,
  updateAssignmentService,
  extendAssignmentService,
  createQuestionService,
  updateQuestionService,
  deleteQuestionService,
  getQuestionsService,
  generateAssignmentService,
  generateSingleQuestionService,
} from "../../../../assignments/assignment.service";
import { formatDateTime } from "@/lib/date";

interface Assignment {
  id: string;
  title: string;
  instructions: string | null;
  totalMarks: number;
  startDate: string | null;
  dueDate: string | null;
  groupId: string | null;
  seriesId: string | null;
  sequenceOrder: number | null;
  dayGap: number | null;
}

interface Option {
  id?: string;
  value: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: "mcq" | "descriptive";
  description: string;
  marks: number;
  modelAnswer: string | null;
  options: Option[];
}

const emptyOption = (): Option => ({ value: "", isCorrect: false });

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = params.id as string;
  const assignmentId = params.assignmentId as string;
  const seriesId = searchParams.get("seriesId");

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qType, setQType] = useState<"mcq" | "descriptive">("descriptive");
  const [qDescription, setQDescription] = useState("");
  const [qMarks, setQMarks] = useState("5");
  const [qModelAnswer, setQModelAnswer] = useState("");
  const [qOptions, setQOptions] = useState<Option[]>([emptyOption(), emptyOption()]);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTotalMarks, setEditTotalMarks] = useState("0");
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("2");
  const [extendMode, setExtendMode] = useState<"grow" | "shift">("grow");
  const [extendCascade, setExtendCascade] = useState(true);
  const [extending, setExtending] = useState(false);

  // AI Generation States
  const [aiGenDialogOpen, setAiGenDialogOpen] = useState(false);
  const [aiEditingQuestionId, setAiEditingQuestionId] = useState<string | null>(null);
  const [aiSubject, setAiSubject] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiQuestionType, setAiQuestionType] = useState("mcq");
  const [aiTopicsInput, setAiTopicsInput] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState("5");
  const [aiMarksPerQuestion, setAiMarksPerQuestion] = useState("5");
  const [aiSpecialInstructions, setAiSpecialInstructions] = useState("");
  const [generatingWithAi, setGeneratingWithAi] = useState(false);

  useEffect(() => {
    if (assignment && assignment.title) {
      setAiSubject(assignment.title);
    }
  }, [assignment]);

  const handleGenerateWithAi = async () => {
    if (!aiSubject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!assignment) return;

    const marks = parseFloat(aiMarksPerQuestion);
    if (!marks || marks <= 0) {
      toast.error("Marks must be a positive number");
      return;
    }

    setGeneratingWithAi(true);
    try {
      if (aiEditingQuestionId) {
        // --- Single Question Edit Mode ---
        if (!aiTopicsInput.trim()) {
          toast.error("Topic is required");
          setGeneratingWithAi(false);
          return;
        }

        const response = await generateSingleQuestionService({
          subject: aiSubject.trim(),
          difficulty: aiDifficulty,
          questionType: aiQuestionType,
          topic: aiTopicsInput.trim(),
          marks,
          specialInstructions: aiSpecialInstructions.trim() || undefined
        });

        const q = response.data;
        if (!q || !q.question_text) {
          throw new Error("No question was generated by the AI agent.");
        }

        toast.success("Question generated successfully. Saving changes...");

        // Update the question
        await updateQuestionService(aiEditingQuestionId, {
          description: q.question_text,
          marks,
          type: q.type === "mcq" ? "mcq" : "descriptive",
          modelAnswer: q.type === "descriptive" ? "AI generated model answer" : undefined,
          options: q.type === "mcq" && Array.isArray(q.options) ? q.options.map((val: string, idx: number) => ({
            value: val,
            isCorrect: String.fromCharCode(65 + idx) === q.correct_option || val === q.correct_option
          })) : undefined
        });

        toast.success("Question updated successfully!");
      } else {
        // --- Batch Generation Mode ---
        const topics = aiTopicsInput.split(",").map(t => t.trim()).filter(t => t !== "");
        if (topics.length === 0) {
          toast.error("At least one topic is required");
          setGeneratingWithAi(false);
          return;
        }
        const count = parseInt(aiQuestionCount);
        if (!count || count < 1) {
          toast.error("Question count must be at least 1");
          setGeneratingWithAi(false);
          return;
        }

        const response = await generateAssignmentService({
          subject: aiSubject.trim(),
          difficulty: aiDifficulty,
          questionType: aiQuestionType,
          topics,
          marksPerQuestion: marks,
          questionCount: count,
          specialInstructions: aiSpecialInstructions.trim() || undefined
        });

        const generated = response.data;
        if (!generated || !Array.isArray(generated.questions) || generated.questions.length === 0) {
          throw new Error("No questions were generated by the AI agent.");
        }

        toast.success(`Successfully generated ${generated.questions.length} questions. Saving...`);

        // Save each question one-by-one
        for (const q of generated.questions) {
          await createQuestionService({
            assignmentId,
            type: q.type === "mcq" ? "mcq" : "descriptive",
            description: q.question_text,
            marks,
            modelAnswer: q.type === "descriptive" ? "AI generated model answer" : undefined,
            options: q.type === "mcq" && Array.isArray(q.options) ? q.options.map((val: string, idx: number) => ({
              value: val,
              isCorrect: String.fromCharCode(65 + idx) === q.correct_option || val === q.correct_option
            })) : undefined
          });
        }

        toast.success("All generated questions saved successfully!");
      }

      setAiGenDialogOpen(false);
      
      // Reload assignment & questions list
      await loadAll(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to generate questions with AI");
    } finally {
      setGeneratingWithAi(false);
    }
  };

  const loadAll = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [aRes, qRes] = await Promise.all([
        getAssignmentByIdService(assignmentId),
        getQuestionsService(assignmentId),
      ]);
      setAssignment(aRes.data);
      setQuestions(qRes.data || []);
    } catch (err) {
      toast.error("Failed to load assignment");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentId) loadAll();
  }, [assignmentId]);

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQType("descriptive");
    setQDescription("");
    setQMarks("5");
    setQModelAnswer("");
    setQOptions([emptyOption(), emptyOption()]);
  };

  const openCreateQuestion = () => {
    resetQuestionForm();
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQType(q.type);
    setQDescription(q.description);
    setQMarks(String(q.marks));
    setQModelAnswer(q.modelAnswer || "");
    setQOptions(q.options.length > 0 ? q.options : [emptyOption(), emptyOption()]);
    setQuestionDialogOpen(true);
  };

  const handleOptionChange = (idx: number, field: "value" | "isCorrect", value: string | boolean) => {
    setQOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const handleSaveQuestion = async () => {
    if (qDescription.trim().length < 10) {
      toast.error("Question description must be at least 10 characters");
      return;
    }
    const marks = parseFloat(qMarks);
    if (!marks || marks < 0.5) {
      toast.error("Marks must be at least 0.5");
      return;
    }
    if (qType === "mcq") {
      const validOptions = qOptions.filter((o) => o.value.trim() !== "");
      if (validOptions.length < 2) {
        toast.error("MCQ needs at least 2 options");
        return;
      }
      if (!validOptions.some((o) => o.isCorrect)) {
        toast.error("MCQ needs at least one correct option");
        return;
      }
    }

    setSavingQuestion(true);
    try {
      if (editingQuestion) {
        await updateQuestionService(editingQuestion.id, {
          description: qDescription.trim(),
          marks,
          modelAnswer: qModelAnswer.trim() || undefined,
          options: qType === "mcq" ? qOptions.filter((o) => o.value.trim() !== "") : undefined,
        });
        toast.success("Question updated");
      } else {
        await createQuestionService({
          assignmentId,
          type: qType,
          description: qDescription.trim(),
          marks,
          modelAnswer: qModelAnswer.trim() || undefined,
          options: qType === "mcq" ? qOptions.filter((o) => o.value.trim() !== "") : undefined,
        });
        toast.success("Question added");
      }
      setQuestionDialogOpen(false);
      resetQuestionForm();
      await loadAll(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question? Any existing student answers to it will also be removed.")) return;
    try {
      await deleteQuestionService(questionId);
      toast.success("Question deleted");
      await loadAll(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete question");
    }
  };

  const toDatetimeLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditAssignment = () => {
    if (!assignment) return;
    setEditTitle(assignment.title);
    setEditStartDate(toDatetimeLocal(assignment.startDate));
    setEditDueDate(toDatetimeLocal(assignment.dueDate));
    setEditTotalMarks(String(assignment.totalMarks));
    setEditDialogOpen(true);
  };

  const handleSaveAssignmentEdit = async () => {
    if (editTitle.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    // totalMarks is dynamically calculated on Postgres, so we don't send or check it here.
    setSavingAssignment(true);
    try {
      const payload: any = { title: editTitle.trim() };
      // Weekly series assignments have their schedule computed/chained from dayGap —
      // must use Extend for those. Standalone and custom-series assignments store
      // fixed dates directly and can be edited here.
      if (!assignment?.seriesId || assignment.dayGap === null) {
        payload.startDate = editStartDate ? new Date(editStartDate).toISOString() : null;
        payload.dueDate = editDueDate ? new Date(editDueDate).toISOString() : null;
      }
      await updateAssignmentService(assignmentId, payload);
      toast.success("Assignment updated");
      setEditDialogOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update assignment");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleExtend = async () => {
    const days = parseInt(extendDays);
    if (!days || days < 1) {
      toast.error("Enter at least 1 day");
      return;
    }
    setExtending(true);
    try {
      await extendAssignmentService(assignmentId, { days, mode: extendMode, cascade: extendCascade });
      toast.success("Schedule updated");
      setExtendDialogOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to extend assignment");
    } finally {
      setExtending(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-center py-10">Loading assignment...</div>;
  if (!assignment) return <div className="text-gray-400 text-center py-10">Assignment not found</div>;

  return (
    <div>
      <button
        onClick={() => {
          const backTarget = seriesId 
            ? `/teacher/classrooms/${classroomId}/assignments?seriesId=${seriesId}`
            : `/teacher/classrooms/${classroomId}/assignments`;
          router.push(backTarget);
        }}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">{assignment.title}</h2>
          {assignment.instructions && <p className="text-gray-400 mt-1">{assignment.instructions}</p>}
          <p className="text-gray-500 text-sm mt-2">
            Total Marks: {assignment.totalMarks} · {assignment.groupId ? "Group-based" : "Class-wide"}
            {(!assignment.seriesId || assignment.dayGap === null) && assignment.startDate && ` · Starts ${formatDateTime(assignment.startDate)}`}
            {(!assignment.seriesId || assignment.dayGap === null) && assignment.dueDate && ` · Due ${formatDateTime(assignment.dueDate)}`}
            {assignment.seriesId && assignment.dayGap !== null && ` · #${assignment.sequenceOrder} of weekly series (${assignment.dayGap}-day window, per-student relative to enrollment)`}
            {assignment.seriesId && assignment.dayGap === null && ` · #${assignment.sequenceOrder} of custom series`}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
            onClick={() => router.push(`/teacher/classrooms/${classroomId}/assignments/${assignmentId}/preview`)}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          {assignment.seriesId && (
            <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5" onClick={() => setExtendDialogOpen(true)}>
              Extend
            </Button>
          )}
          <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={openEditAssignment}>
            <Pencil className="mr-2 h-4 w-4" /> Update Assignment
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 mb-4">
        <Button
          className="bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => {
            setAiEditingQuestionId(null);
            setAiSubject(assignment?.title.split(":")[0] || "");
            setAiTopicsInput("");
            setAiQuestionCount("5");
            setAiMarksPerQuestion("5");
            setAiSpecialInstructions("");
            setAiGenDialogOpen(true);
          }}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
        </Button>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={openCreateQuestion}>
          <Plus className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card className="bg-[#0f0f11] border-white/5 py-10 text-center">
          <CardContent>
            <ListChecks className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No questions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q, idx) => (
            <Card key={q.id} className="bg-[#0f0f11] border-white/5">
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500">Q{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-gray-400 uppercase">{q.type}</span>
                      <span className="text-xs text-emerald-400 font-semibold">{q.marks} marks</span>
                    </div>
                    <p className="text-white text-sm">{q.description}</p>
                    {q.type === "mcq" && (
                      <div className="mt-2 flex flex-col gap-1">
                        {q.options.map((o, i) => (
                          <div key={o.id || i} className={`text-xs px-2 py-1 rounded ${o.isCorrect ? "bg-[#18181b]merald-500/15 text-emerald-200 border border-emerald-500/30" : "bg-zinc-800 text-white/70 border border-zinc-700"}`}>
                            {o.isCorrect && <Check className="inline h-3 w-3 mr-1" />}
                            {o.value}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === "descriptive" && q.modelAnswer && (
                      <p className="text-xs text-gray-500 mt-2 italic">Model answer: {q.modelAnswer}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-400/10"
                      onClick={() => {
                        setAiEditingQuestionId(q.id);
                        setAiSubject(assignment?.title.split(":")[0] || "");
                        setAiTopicsInput("");
                        setAiQuestionCount("1");
                        setAiMarksPerQuestion(String(q.marks));
                        setAiQuestionType(q.type);
                        setAiSpecialInstructions("");
                        setAiGenDialogOpen(true);
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="bg-[#14151f] border-white/15 text-white hover:bg-white/10 h-8 px-3 text-xs font-semibold" onClick={() => openEditQuestion(q)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs font-semibold" onClick={() => handleDeleteQuestion(q.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create/Edit Question Dialog ──────────────────────────────── */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {!editingQuestion && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Question Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQType("descriptive")}
                    className={qType === "descriptive" ? "bg-orange-500/20 text-sky-200 border-orange-500/50 font-medium" : "bg-transparent border-white/10 text-white/70"}
                  >
                    Descriptive
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQType("mcq")}
                    className={qType === "mcq" ? "bg-orange-500/20 text-sky-200 border-orange-500/50 font-medium" : "bg-transparent border-white/10 text-white/70"}
                  >
                    MCQ
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea
                value={qDescription}
                onChange={(e) => setQDescription(e.target.value)}
                rows={3}
                placeholder="Write the question..."
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Marks</label>
              <input
                type="number"
                step="0.5"
                value={qMarks}
                onChange={(e) => setQMarks(e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
              />
            </div>

            {qType === "descriptive" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Model Answer (optional, helps you grade later)</label>
                <textarea
                  value={qModelAnswer}
                  onChange={(e) => setQModelAnswer(e.target.value)}
                  rows={2}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Options (mark the correct one)</label>
                {qOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOptionChange(idx, "isCorrect", !opt.isCorrect)}
                      className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center transition-all ${opt.isCorrect ? "bg-[#18181b]merald-600 border-emerald-500 text-white" : "bg-[#18181b] border-white/10 text-white/60"}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={opt.value}
                      onChange={(e) => handleOptionChange(idx, "value", e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
                    />
                    {qOptions.length > 2 && (
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-red-400 hover:text-red-300 shrink-0" onClick={() => setQOptions((prev) => prev.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {qOptions.length < 5 && (
                  <Button type="button" variant="outline" className="w-full bg-transparent border-dashed border-white/10 text-gray-400 hover:text-white" onClick={() => setQOptions((prev) => [...prev, emptyOption()])}>
                    <Plus className="h-4 w-4 mr-2" /> Add Option
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" size="lg" className="text-gray-300 hover:text-white" onClick={() => setQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSaveQuestion} disabled={savingQuestion}>
              {savingQuestion ? "Saving..." : editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Assignment Dialog ───────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Edit Assignment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
              />
            </div>


            {assignment.seriesId && assignment.dayGap !== null ? (
              <p className="text-xs text-gray-500 p-3 bg-[#18181b] border border-white/10 rounded-lg">
                This assignment is part of a weekly series — its schedule is computed per student. Use "Extend" on the assignment page to change its timing.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Start Date</label>
                  <input
                    type="datetime-local"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Due Date</label>
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" size="lg" className="text-gray-300 hover:text-white" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSaveAssignmentEdit} disabled={savingAssignment}>
              {savingAssignment ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Extend Assignment Dialog ─────────────────────────────────── */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Extend Assignment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Extend by (days)</label>
              <Input
                type="number"
                min="1"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="bg-[#18181b] border-white/10 text-white text-sm h-auto py-3 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">What should move?</label>
              <RadioGroup
                value={extendMode}
                onValueChange={(value) => setExtendMode(value as "grow" | "shift")}
                className="grid grid-cols-1 gap-2"
              >
                {(
                  [
                    { value: "grow", title: "Grow duration", desc: "Start date stays put, due date pushes out — the assignment just runs longer." },
                    { value: "shift", title: "Shift window", desc: "Both start and due date slide later — same duration, just starts later." },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 text-left p-3 rounded-lg border cursor-pointer transition-all ${extendMode === opt.value ? "bg-orange-500/20 border-orange-500/50" : "bg-[#18181b] border-white/10 hover:bg-white/5"}`}
                  >
                    <RadioGroupItem value={opt.value} className="mt-0.5 border-gray-500 data-[checked]:border-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{opt.title}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#18181b] border border-white/10 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-300">Reflow later assignments in the series?</label>
                <p className="text-[11px] text-gray-500">On: they shift to chain from this one's new dates. Off: they keep their original schedule.</p>
              </div>
              <Switch checked={extendCascade} onCheckedChange={setExtendCascade} />
            </div>
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" size="lg" className="text-gray-300 hover:text-white" onClick={() => setExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleExtend} disabled={extending}>
              {extending ? "Applying..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AI Generation Dialog ─────────────────────────────────────── */}
      <Dialog open={aiGenDialogOpen} onOpenChange={setAiGenDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              {aiEditingQuestionId ? "Edit Question with AI" : "Generate Questions with AI"}
            </DialogTitle>
          </DialogHeader>

          {generatingWithAi ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
              <p className="text-sm text-gray-400 text-center">Our AI agent is reviewing the RAG context and generating assignment question(s). This may take up to a minute...</p>
            </div>
          ) : (
            <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. JavaScript, SQL"
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="w-full bg-[#14151f] border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-400 focus:outline-none focus:border-white/30 transition-all text-sm h-11"
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
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-300">Question Type</label>
                  <select
                    value={aiQuestionType}
                    onChange={(e) => setAiQuestionType(e.target.value)}
                    className="w-full bg-[#14151f] border border-white/15 text-white rounded-xl h-11 px-3.5 focus:outline-none focus:border-white/30 text-sm"
                  >
                    <option value="mcq">MCQ</option>
                    <option value="descriptive">Descriptive</option>
                  </select>
                </div>
                {aiEditingQuestionId ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">Marks</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={aiMarksPerQuestion}
                      onChange={(e) => setAiMarksPerQuestion(e.target.value)}
                      className="w-full bg-[#14151f] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-all text-sm h-11"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">Question Count</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={aiQuestionCount}
                      onChange={(e) => setAiQuestionCount(e.target.value)}
                      className="w-full bg-[#14151f] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-all text-sm h-11"
                    />
                  </div>
                )}
              </div>

              {!aiEditingQuestionId && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-300">Marks per Question</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={aiMarksPerQuestion}
                    onChange={(e) => setAiMarksPerQuestion(e.target.value)}
                    className="w-full bg-[#14151f] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-all text-sm h-11"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">
                  {aiEditingQuestionId ? "Topic" : "Topics (comma-separated)"}
                </label>
                <textarea
                  placeholder={aiEditingQuestionId ? "e.g. Variables" : "e.g. Variables, Data Types, Closures"}
                  value={aiTopicsInput}
                  onChange={(e) => setAiTopicsInput(e.target.value)}
                  rows={2}
                  className="w-full bg-[#14151f] border border-white/15 rounded-xl p-3 text-white placeholder:text-zinc-400 focus:outline-none focus:border-white/30 transition-all text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Special Instructions (optional)</label>
                <textarea
                  placeholder="e.g. Include scenario-based real-world application questions"
                  value={aiSpecialInstructions}
                  onChange={(e) => setAiSpecialInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-[#14151f] border border-white/15 rounded-xl p-3 text-white placeholder:text-zinc-400 focus:outline-none focus:border-white/30 transition-all text-sm resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="bg-transparent border-0 p-0 mt-4 flex items-center justify-end gap-3">
            <Button variant="ghost" className="text-gray-300 hover:text-white font-semibold" onClick={() => setAiGenDialogOpen(false)} disabled={generatingWithAi}>
              Cancel
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl px-6 h-11 shadow-lg shadow-orange-950/40" onClick={handleGenerateWithAi} disabled={generatingWithAi}>
              Generate & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
