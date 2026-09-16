"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, FileText, Loader2, Plus, UploadCloud, X, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  listQuestionBankDocuments,
  uploadQuestionBankDocument,
  generateQuestionsFromDocuments,
  QuestionBankDocument,
  QuestionBankVisibility,
  GeneratedTopicGroup,
  GeneratedQuestion,
  TopicTier,
  Difficulty,
  QuestionType,
} from "@/services/questionBank.service";
import { saveGeneratedExamService } from "../../../../exams/exam.service";
import type { WorkspaceParts } from "./QuestionBuilder";
import { StatTile } from "./workspace";

export type PyqStage = "papers" | "settings" | "preview";

const TIERS: { id: TopicTier; label: string; hint: string }[] = [
  { id: "high", label: "High priority", hint: "Gets the most questions" },
  { id: "mid", label: "Mid priority", hint: "A moderate share" },
  { id: "low", label: "Low priority", hint: "A few questions" },
];

const MCQ_LETTERS = ["A", "B", "C", "D", "E", "F"];

const fieldClass = "bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-500 h-9 text-sm rounded-lg";
const selectClass = "w-full bg-[#14151f] border border-white/15 text-white h-9 rounded-lg px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50";
const primaryButton = "bg-purple-600 hover:bg-purple-700 text-white h-10 px-6 font-bold text-sm rounded-xl shadow-lg shadow-purple-950/40";
const ghostButton = "text-gray-400 hover:text-white h-10 px-4 text-sm font-semibold";

function TierInput({ tier, topics, onAdd, onRemove }: { tier: (typeof TIERS)[number]; topics: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const t = value.trim();
    if (!t) return;
    onAdd(t);
    setValue("");
  };
  return (
    <div className="bg-[#09090b] border border-white/10 rounded-xl p-3 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">{tier.label}</span>
        <span className="text-[11px] text-gray-500">{tier.hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {topics.length === 0 && <span className="text-[11px] italic text-gray-500">No topics yet</span>}
        {topics.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs bg-orange-500/10 border border-orange-500/25 text-orange-200">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onRemove(t)} className="hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type a topic and press Enter"
          className={cn(fieldClass, "flex-1")}
        />
        <Button type="button" variant="outline" onClick={submit} className="h-9 bg-transparent border-white/15 text-gray-200 hover:bg-white/5">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

function RetrievedQuestion({ q, index, documentTitle, removed, onToggle }: { q: GeneratedQuestion; index: number; documentTitle: string; removed: boolean; onToggle: () => void }) {
  return (
    <div className={cn("rounded-xl border p-4 text-sm transition-opacity", removed ? "border-white/5 opacity-40" : "border-white/10 bg-[#0f0f11]")}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-gray-100 whitespace-pre-wrap">
          <span className="text-orange-400 font-mono text-xs mr-2">Q{index + 1}</span>
          {q.question_text}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-400">{q.marks} marks</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggle}
            className={cn(
              "h-7 px-2 text-[11px] bg-transparent",
              removed ? "border-white/15 text-gray-300 hover:bg-white/5" : "border-red-500/25 text-red-300 hover:bg-red-500/10"
            )}
          >
            {removed ? "Keep" : "Remove"}
          </Button>
        </div>
      </div>
      {q.type === "mcq" && q.options && (
        <ul className="mt-2.5 grid gap-1 text-xs">
          {q.options.map((opt, oi) => {
            const isCorrect = MCQ_LETTERS[oi] === q.correct_option;
            return (
              <li key={oi} className={cn("text-gray-300", isCorrect && "font-semibold text-emerald-400")}>
                {MCQ_LETTERS[oi]}. {opt} {isCorrect && "✓"}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500">
        <span>
          from {documentTitle}
          {q.source.questionNumber ? ` · Q${q.source.questionNumber}` : ""} · page {q.source.pageStart}
        </span>
        {q.type === "mcq" && !q.correct_option && (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3 w-3" /> No answer key in the paper, set one after adding
          </span>
        )}
      </div>
    </div>
  );
}

export function PyqFlow({
  examId,
  onBack,
  onSuccess,
  renderShell,
  onStageChange,
}: {
  examId: string;
  onBack: () => void;
  onSuccess: () => void;
  renderShell: (parts: WorkspaceParts) => React.ReactNode;
  onStageChange?: (stage: PyqStage) => void;
}) {
  const [stage, setStage] = useState<PyqStage>("papers");
  const [documents, setDocuments] = useState<QuestionBankDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadVisibility, setUploadVisibility] = useState<QuestionBankVisibility>("private");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tiers, setTiers] = useState<Record<TopicTier, string[]>>({ high: [], mid: [], low: [] });
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [marks, setMarks] = useState("2");
  const [questionCount, setQuestionCount] = useState("10");

  const [isRetrieving, setIsRetrieving] = useState(false);
  const [results, setResults] = useState<GeneratedTopicGroup[] | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    onStageChange?.(stage);
  }, [stage]);

  const loadDocuments = async () => {
    try {
      setDocuments(await listQuestionBankDocuments());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load papers");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const hasProcessing = documents.some((d) => d.status === "pending" || d.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => void loadDocuments(), 4000);
    return () => clearInterval(timer);
  }, [hasProcessing]);

  const documentTitles = useMemo(() => Object.fromEntries(documents.map((d) => [d.id, d.title])), [documents]);
  const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
  const allTopics = [...tiers.high, ...tiers.mid, ...tiers.low];

  const keptQuestions = (results ?? []).flatMap((g) => g.questions.filter((q) => !removedIds.has(q.id)));
  const keptMarks = keptQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  const toggleDocument = (id: string) =>
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Choose a PDF to upload");
      return;
    }
    setIsUploading(true);
    try {
      await uploadQuestionBankDocument(uploadFile, uploadTitle, uploadVisibility);
      toast.success("Paper uploaded. It will be ready to select once processing finishes.");
      setUploadFile(null);
      setUploadTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetrieve = async () => {
    if (allTopics.length === 0) {
      toast.error("Add at least one topic");
      return;
    }
    const count = Number(questionCount);
    const marksEach = Number(marks);
    if (!count || count < 1 || count > 50) {
      toast.error("Total questions must be between 1 and 50");
      return;
    }
    if (!marksEach || marksEach < 1) {
      toast.error("Marks per question must be at least 1");
      return;
    }

    setIsRetrieving(true);
    setStage("preview");
    try {
      const groups = await generateQuestionsFromDocuments({
        documentIds: selectedDocIds,
        topics: tiers,
        difficulty,
        questionCount: count,
        questionType,
        marks: marksEach,
      });
      setResults(groups);
      setRemovedIds(new Set());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not retrieve questions");
      setStage("settings");
    } finally {
      setIsRetrieving(false);
    }
  };

  const handleAddToExam = async () => {
    if (!results || keptQuestions.length === 0) {
      toast.error("Keep at least one question to add");
      return;
    }
    setIsSaving(true);
    try {
      const blocks = results
        .map((g) => {
          const questions = g.questions
            .filter((q) => !removedIds.has(q.id))
            .map((q) =>
              q.type === "mcq"
                ? {
                    type: "mcq",
                    description: q.question_text,
                    marks: q.marks,
                    options: (q.options ?? []).map((opt, i) => ({ value: opt, isCode: false, isCorrect: MCQ_LETTERS[i] === q.correct_option })),
                  }
                : { type: "descriptive", description: q.question_text, marks: q.marks }
            );
          return {
            name: g.topic,
            subject: "",
            question_type: questionType,
            total_marks: questions.reduce((s, q) => s + (Number(q.marks) || 0), 0),
            instructions: [],
            questions,
          };
        })
        .filter((b) => b.questions.length > 0);

      await saveGeneratedExamService({ examId, sections: [{ name: "Section A", blocks }] });
      toast.success(`${keptQuestions.length} question(s) added to the exam`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to add questions");
    } finally {
      setIsSaving(false);
    }
  };

  if (stage === "papers") {
    const left = (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Choose past papers</h2>
          <p className="text-xs text-gray-400 mt-0.5">Questions will only be taken from the papers you tick. Upload new ones from the panel on the right.</p>
        </div>
        {loadingDocs ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-10 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading papers...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-10 text-center space-y-2">
            <FileText className="h-8 w-8 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-300 font-semibold">No papers yet</p>
            <p className="text-xs text-gray-500">Upload a past paper PDF from the panel on the right to get started.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {documents.map((doc) => {
              const ready = doc.status === "completed";
              const checked = selectedDocIds.includes(doc.id);
              return (
                <label
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3.5 transition-colors",
                    ready ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                    checked ? "border-orange-500/50 bg-orange-500/5" : "border-white/10 bg-[#0f0f11] hover:bg-[#15151a]"
                  )}
                >
                  <input type="checkbox" disabled={!ready} checked={checked} onChange={() => toggleDocument(doc.id)} className="h-4 w-4 accent-orange-500" />
                  <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
                    <p className="text-[11px] text-gray-500">
                      {doc.visibility === "organisation" ? "Shared with organisation" : "Private"}
                      {doc.status === "failed" && doc.error ? ` · ${doc.error}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold shrink-0",
                      ready && "text-gray-400",
                      (doc.status === "pending" || doc.status === "processing") && "text-amber-400",
                      doc.status === "failed" && "text-red-400"
                    )}
                  >
                    {ready ? `${doc.totalChunks} questions` : doc.status === "failed" ? "Failed" : "Processing..."}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );

    const right = (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-[#0f0f11] p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-orange-400" /> Upload a paper
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
          />
          <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Title (optional)" className={fieldClass} />
          <select value={uploadVisibility} onChange={(e) => setUploadVisibility(e.target.value as QuestionBankVisibility)} className={selectClass}>
            <option value="private">Private, only me</option>
            <option value="organisation">Share with my organisation</option>
          </select>
          <Button onClick={handleUpload} disabled={isUploading || !uploadFile} className="w-full bg-orange-600 hover:bg-orange-700 text-white h-9 text-sm font-semibold">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile label="Selected" value={selectedDocIds.length} tone="text-orange-300" />
          <StatTile label="Questions" value={selectedDocs.reduce((n, d) => n + d.totalChunks, 0)} tone="text-purple-300" />
        </div>
      </div>
    );

    const footer = (
      <>
        <Button variant="ghost" onClick={onBack} className={ghostButton}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Previous
        </Button>
        <Button
          onClick={() => (selectedDocIds.length === 0 ? toast.error("Select at least one paper") : setStage("settings"))}
          className={primaryButton}
        >
          Next <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </>
    );

    return renderShell({ left, right, footer });
  }

  if (stage === "settings") {
    const left = (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Topics and question settings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Questions are shared out by priority, so high-priority topics get the most.</p>
        </div>
        <div className="grid gap-3">
          {TIERS.map((tier) => (
            <TierInput
              key={tier.id}
              tier={tier}
              topics={tiers[tier.id]}
              onAdd={(t) => setTiers((prev) => (prev[tier.id].includes(t) ? prev : { ...prev, [tier.id]: [...prev[tier.id], t] }))}
              onRemove={(t) => setTiers((prev) => ({ ...prev, [tier.id]: prev[tier.id].filter((x) => x !== t) }))}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Difficulty</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={selectClass}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Type</span>
            <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className={selectClass}>
              <option value="mcq">MCQ</option>
              <option value="descriptive">Descriptive</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Marks each</span>
            <Input type="number" min={1} value={marks} onChange={(e) => setMarks(e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Total questions</span>
            <Input type="number" min={1} max={50} value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} className={fieldClass} />
          </label>
        </div>
      </div>
    );

    const right = (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-[#0f0f11] p-4 space-y-2">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Drawing from</h3>
          <ul className="space-y-1.5">
            {selectedDocs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-xs text-gray-200">
                <FileText className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{d.title}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile label="Topics" value={allTopics.length} tone="text-orange-300" />
          <StatTile label="Questions" value={Number(questionCount) || 0} tone="text-purple-300" />
        </div>
        <StatTile label="Total marks" value={(Number(questionCount) || 0) * (Number(marks) || 0)} tone="text-emerald-400" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Questions are taken word for word from the papers. If the papers don&apos;t have enough for a topic, you&apos;ll get fewer than requested.
        </p>
      </div>
    );

    const footer = (
      <>
        <Button variant="ghost" onClick={() => setStage("papers")} className={ghostButton}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Previous
        </Button>
        <Button onClick={handleRetrieve} className={primaryButton}>
          <Sparkles className="h-4 w-4 mr-2" /> Find Questions
        </Button>
      </>
    );

    return renderShell({ left, right, footer });
  }

  const left = isRetrieving ? (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="w-14 h-14 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
      <p className="text-sm font-bold text-white">Finding matching questions...</p>
    </div>
  ) : (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Preview questions</h2>
        <p className="text-xs text-gray-400 mt-0.5">Remove any you don&apos;t want. The rest are added to the exam exactly as shown.</p>
      </div>
      {(results ?? []).map((group) => (
        <div key={`${group.tier}-${group.topic}`} className="space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-white">
              {group.topic}
              <span className="ml-2 text-[11px] font-semibold text-gray-500 uppercase">{group.tier} priority</span>
            </h3>
            <span className="text-[11px] text-gray-400">
              {group.questions.length} of {group.allocatedQuestions} found
            </span>
          </div>
          {group.questions.length === 0 ? (
            <p className="text-xs italic text-gray-500 rounded-xl border border-dashed border-white/10 p-4">The selected papers had no questions matching this topic.</p>
          ) : (
            group.questions.map((q, i) => (
              <RetrievedQuestion
                key={q.id}
                q={q}
                index={i}
                documentTitle={documentTitles[q.source.documentId] ?? "source paper"}
                removed={removedIds.has(q.id)}
                onToggle={() =>
                  setRemovedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(q.id)) next.delete(q.id);
                    else next.add(q.id);
                    return next;
                  })
                }
              />
            ))
          )}
        </div>
      ))}
    </div>
  );

  const right = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="Keeping" value={keptQuestions.length} tone="text-purple-300" />
        <StatTile label="Removed" value={removedIds.size} tone="text-gray-300" />
      </div>
      <StatTile label="Total marks" value={keptMarks} tone="text-emerald-400" />
      <p className="text-[11px] text-gray-500 leading-relaxed">
        After adding, you can edit any question or ask the Question Review Agent for changes.
      </p>
    </div>
  );

  const footer = (
    <>
      <Button variant="ghost" disabled={isRetrieving || isSaving} onClick={() => setStage("settings")} className={ghostButton}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Previous
      </Button>
      <Button onClick={handleAddToExam} disabled={isRetrieving || isSaving || keptQuestions.length === 0} className={primaryButton}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${keptQuestions.length} Question${keptQuestions.length === 1 ? "" : "s"} to Exam`}
      </Button>
    </>
  );

  return renderShell({ left, right, footer });
}
