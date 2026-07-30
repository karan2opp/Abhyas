"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Pencil, ListChecks, X, Check, Eye } from "lucide-react";
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
  const classroomId = params.id as string;
  const assignmentId = params.assignmentId as string;

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
  const [editTotalMarks, setEditTotalMarks] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("2");
  const [extendMode, setExtendMode] = useState<"grow" | "shift">("grow");
  const [extendCascade, setExtendCascade] = useState(true);
  const [extending, setExtending] = useState(false);

  const loadAll = async () => {
    setLoading(true);
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
      setLoading(false);
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
      const qRes = await getQuestionsService(assignmentId);
      setQuestions(qRes.data || []);
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
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
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
    const marks = parseFloat(editTotalMarks);
    if (!marks || marks < 1) {
      toast.error("Total marks must be at least 1");
      return;
    }
    setSavingAssignment(true);
    try {
      const payload: any = { title: editTitle.trim(), totalMarks: marks };
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
        onClick={() => router.push(`/teacher/classrooms/${classroomId}/assignments`)}
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
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openEditAssignment}>
            <Pencil className="mr-2 h-4 w-4" /> Update Assignment
          </Button>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreateQuestion}>
          <Plus className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card className="bg-[#111520] border-white/5 py-10 text-center">
          <CardContent>
            <ListChecks className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No questions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q, idx) => (
            <Card key={q.id} className="bg-[#111520] border-white/5">
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
                          <div key={o.id || i} className={`text-xs px-2 py-1 rounded ${o.isCorrect ? "bg-emerald-600/10 text-emerald-400" : "text-gray-400"}`}>
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => openEditQuestion(q)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => handleDeleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4" />
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
        <DialogContent className="bg-[#111520] border border-white/10 text-white sm:max-w-lg">
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
                    className={qType === "descriptive" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : "bg-transparent border-white/10 text-gray-400"}
                  >
                    Descriptive
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQType("mcq")}
                    className={qType === "mcq" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : "bg-transparent border-white/10 text-gray-400"}
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
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Marks</label>
              <input
                type="number"
                step="0.5"
                value={qMarks}
                onChange={(e) => setQMarks(e.target.value)}
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
              />
            </div>

            {qType === "descriptive" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Model Answer (optional, helps you grade later)</label>
                <textarea
                  value={qModelAnswer}
                  onChange={(e) => setQModelAnswer(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
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
                      className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center transition-all ${opt.isCorrect ? "bg-emerald-600 border-emerald-500 text-white" : "bg-[#1a1f2e] border-white/10 text-gray-500"}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={opt.value}
                      onChange={(e) => handleOptionChange(idx, "value", e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-[#1a1f2e] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
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
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveQuestion} disabled={savingQuestion}>
              {savingQuestion ? "Saving..." : editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Assignment Dialog ───────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#111520] border border-white/10 text-white sm:max-w-lg">
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
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Total Marks</label>
              <input
                type="number"
                value={editTotalMarks}
                onChange={(e) => setEditTotalMarks(e.target.value)}
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
              />
            </div>

            {assignment.seriesId && assignment.dayGap !== null ? (
              <p className="text-xs text-gray-500 p-3 bg-[#1a1f2e] border border-white/10 rounded-lg">
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
                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Due Date</label>
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" size="lg" className="text-gray-300 hover:text-white" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveAssignmentEdit} disabled={savingAssignment}>
              {savingAssignment ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Extend Assignment Dialog ─────────────────────────────────── */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="bg-[#111520] border border-white/10 text-white sm:max-w-lg">
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
                className="bg-[#1a1f2e] border-white/10 text-white text-sm h-auto py-3 focus-visible:ring-white/30 focus-visible:border-white/30"
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
                    className={`flex items-start gap-3 text-left p-3 rounded-lg border cursor-pointer transition-all ${extendMode === opt.value ? "bg-blue-500/20 border-blue-500/50" : "bg-[#1a1f2e] border-white/10 hover:bg-white/5"}`}
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

            <div className="flex items-center justify-between p-3 bg-[#1a1f2e] border border-white/10 rounded-lg">
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
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExtend} disabled={extending}>
              {extending ? "Applying..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
