"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Database, Plus, RefreshCw, Search, Trash2, CheckCircle2, AlertCircle,
  BookOpen, Sparkles, FileQuestion, ListChecks, X, UploadCloud, FileCode, FileCheck2
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  addQuestionToBankService,
  getQuestionBankService,
  deleteQuestionFromBankService,
  uploadQuestionBankFileService,
  BankQuestion,
} from "@/services/questionBank.service";

const QUICK_SUBJECTS = ["JavaScript", "Python", "Tally", "React", "Database", "Operating Systems"];

export default function QuestionBankView() {
  const role = useAuthStore((state) => state.user?.role);
  const canEmbed = role === "manager" || role === "system_admin";
  const [activeTab, setActiveTab] = useState<"add" | "upload" | "list">(canEmbed ? "add" : "list");

  // Add form state
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [type, setType] = useState<"mcq" | "descriptive">("mcq");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [marks, setMarks] = useState<number>(1);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  // List state
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listSearch, setListSearch] = useState("");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBank = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await getQuestionBankService();
      setBank(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load question bank");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchBank();
  }, [fetchBank]);

  const setOption = (idx: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!question.trim()) {
      toast.error("Question text is required.");
      return;
    }
    if (type === "mcq") {
      const filled = options.map((o) => o.trim());
      if (filled.some((o) => !o)) {
        toast.error("All 4 options must be filled.");
        return;
      }
      const unique = new Set(filled);
      if (unique.size !== 4) {
        toast.error("Options must be unique.");
        return;
      }
    }

    setIsAdding(true);
    try {
      const payload: any = {
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        subtopic: subtopic.trim() || undefined,
        type,
        difficulty,
        question: question.trim(),
        marks,
      };
      if (type === "mcq") {
        payload.options = options.map((o) => o.trim());
        payload.correctOption = options[correctOption]?.trim();
      }

      const result = await addQuestionToBankService(payload);
      if (result.indexed > 0) {
        toast.success(`Question added to bank! (${result.indexed} indexed, ${result.skipped} duplicate)`);
      } else {
        toast.info("This question already exists in the bank (duplicate skipped).");
      }

      // Reset form
      setSubject("");
      setTopic("");
      setSubtopic("");
      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectOption(0);
      setMarks(1);
      setActiveTab("list");
      fetchBank();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add question to bank");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (q: BankQuestion) => {
    if (!window.confirm("Delete this question from the bank?")) return;
    try {
      await deleteQuestionFromBankService(q.questionId);
      toast.success("Question deleted from bank.");
      fetchBank();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete question");
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "md" && ext !== "markdown" && ext !== "json") {
      toast.error("Only Markdown (.md) and JSON (.json) files are supported.");
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20 MB limit.");
      return;
    }
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a Markdown or JSON file.");
      return;
    }
    setIsUploading(true);
    try {
      const result = await uploadQuestionBankFileService(file);
      if (result.indexed > 0) {
        toast.success(`File indexed! ${result.indexed} question(s) added, ${result.skipped} duplicate, ${result.errors} error(s).`);
      } else if (result.errors > 0) {
        toast.error(`No new questions indexed. ${result.skipped} duplicate, ${result.errors} error(s).`);
      } else {
        toast.info("All questions in this file were already in the bank (duplicates skipped).");
      }
      setFile(null);
      setActiveTab("list");
      fetchBank();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload question bank file");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredBank = bank.filter((q) => {
    const hay = `${q.subject} ${q.topic} ${q.subtopic} ${q.question}`.toLowerCase();
    return hay.includes(listSearch.toLowerCase());
  });

  const totalQuestions = bank.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar">
      {/* Header Banner */}
      <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-600/20 text-orange-400 border border-orange-500/30 p-2.5 rounded-xl">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Curated Question Bank</h1>
                <p className="text-sm text-gray-400">
                  Embed reference questions that the AI uses to calibrate difficulty & format during exam generation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-4 py-2 rounded-xl shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-gray-300">
              Qdrant Collection: <strong className="text-orange-400 font-semibold">question_examples</strong>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
          {canEmbed && (
            <>
              <button
                onClick={() => setActiveTab("add")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
                  activeTab === "add"
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40 font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>

              <button
                onClick={() => setActiveTab("upload")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
                  activeTab === "upload"
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40 font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <UploadCloud className="h-4 w-4" />
                Upload .md File
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
              activeTab === "list"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40 font-semibold"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ListChecks className="h-4 w-4" />
            Bank Questions ({totalQuestions})
          </button>
        </div>
      </div>

      {/* ── TAB 1: ADD QUESTION ─────────────────────────────────────────────── */}
      {activeTab === "add" && canEmbed && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-orange-400" />
              Add a Reference Question
            </h2>

            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Subject Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JavaScript, Python, Tally"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="text-[11px] text-gray-500 self-center mr-1">Quick select:</span>
                    {QUICK_SUBJECTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSubject(s)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          subject === s
                            ? "bg-orange-600 text-white border-orange-500 font-semibold"
                            : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marks + Difficulty */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Marks
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={marks}
                      onChange={(e) => setMarks(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Difficulty <span className="text-orange-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {(["easy", "medium", "hard"] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`flex-1 capitalize text-xs px-3 py-2 rounded-xl border font-medium transition-all ${
                            difficulty === d
                              ? d === "easy"
                                ? "bg-emerald-600 text-white border-emerald-500"
                                : d === "medium"
                                ? "bg-amber-600 text-white border-amber-500"
                                : "bg-red-600 text-white border-red-500"
                              : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Topic + Subtopic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Topic (Recommended)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Functions, Variables"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Subtopic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Recursion"
                    value={subtopic}
                    onChange={(e) => setSubtopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              {/* Type toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Question Type <span className="text-orange-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(["mcq", "descriptive"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 capitalize text-xs px-3 py-2 rounded-xl border font-medium transition-all ${
                        type === t
                          ? "bg-orange-600 text-white border-orange-500"
                          : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {t === "mcq" ? "MCQ (Multiple Choice)" : "Descriptive"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question text */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Question Text <span className="text-orange-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type the question here..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all resize-none"
                />
              </div>

              {/* MCQ options */}
              {type === "mcq" && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Options & Correct Answer <span className="text-orange-500">*</span>
                  </label>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectOption(idx)}
                        title="Mark as correct answer"
                        className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center text-sm font-bold transition-all ${
                          correctOption === idx
                            ? "bg-emerald-600 text-white border-emerald-400"
                            : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        value={opt}
                        onChange={(e) => setOption(idx, e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all"
                      />
                      {correctOption === idx && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-500">
                    Click the letter (A/B/C/D) to mark the correct option.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isAdding}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-all"
              >
                {isAdding ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Embedding into Qdrant...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Add Question to Bank
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info Side */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-400" />
                How it's used
              </h3>
              <div className="space-y-3 text-xs text-gray-400">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <p>
                    During exam generation, these questions are retrieved per topic
                    and passed to the AI as <strong className="text-gray-200">reference_examples</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <p>
                    The planning agent uses them to judge what "easy / medium / hard"
                    means for each topic in your bank.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <p>
                    The AI is told to use them as <strong className="text-gray-200">style & difficulty references</strong> only — never copied verbatim.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Bank Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-xs">Total Questions</span>
                  <span className="font-bold text-orange-400 text-sm">{totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-xs">MCQs</span>
                  <span className="font-bold text-white text-sm">
                    {bank.filter((q) => q.type === "mcq").length}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-xs">Descriptive</span>
                  <span className="font-bold text-white text-sm">
                    {bank.filter((q) => q.type === "descriptive").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Subjects</span>
                  <span className="font-bold text-white text-sm">
                    {new Set(bank.map((q) => q.subject)).size}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: UPLOAD .md / .json FILE ─────────────────────────────────── */}
      {activeTab === "upload" && canEmbed && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Form Side */}
          <div className="lg:col-span-8 bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-orange-400" />
              Upload a Question Bank File
            </h2>

            <form onSubmit={handleUpload} className="space-y-5">
              {/* Drag & Drop File Zone */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Markdown (.md) or JSON (.json) File
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-orange-500 bg-orange-500/10 scale-[1.01]"
                      : file
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-white/15 bg-black/40 hover:border-orange-500/40 hover:bg-white/5"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,.json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {file ? (
                    <div className="flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-orange-600/20 text-orange-400 p-3 rounded-lg shrink-0 border border-orange-500/30">
                          <FileCode className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB • {file.name.split('.').pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-white">
                        Click to upload or drag & drop file here
                      </p>
                      <p className="text-xs text-gray-400">
                        Supports <strong className="text-gray-200">Markdown (.md)</strong> and <strong className="text-gray-200">JSON (.json)</strong> files up to 20 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading || !file}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-all"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Parsing & Embedding Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Upload & Embed into Qdrant
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info Side */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-orange-400" />
                Supported Format
              </h3>
              <div className="space-y-3 text-xs text-gray-400">
                <p>
                  Each question is a <strong className="text-gray-200">YAML frontmatter</strong> block followed by its body:
                </p>
                <pre className="bg-black/60 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-gray-300 overflow-x-auto">
{`---
subject: JavaScript
topic: Variables
subtopic: Hoisting
type: mcq
difficulty: medium
marks: 1
---

Question text...

- [ ] Wrong option
- [x] Correct option
- [ ] Option 3
- [ ] Option 4`}
                </pre>
                <ul className="space-y-2">
                  <li><strong className="text-gray-200">subject</strong> is required; <strong className="text-gray-200">topic</strong>/<strong className="text-gray-200">subtopic</strong> optional.</li>
                  <li><strong className="text-gray-200">type</strong>: mcq | descriptive &nbsp; <strong className="text-gray-200">difficulty</strong>: easy | medium | hard.</li>
                  <li>MCQ must have exactly 4 options with one <strong className="text-gray-200">- [x]</strong>.</li>
                  <li>A JSON array of question objects is also accepted.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LIST QUESTIONS ───────────────────────────────────────────── */}
      {activeTab === "list" && (
        <div className="space-y-6">
          <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search subject, topic, subtopic or question..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:border-orange-500 outline-none"
                />
              </div>

              <button
                onClick={fetchBank}
                disabled={isLoadingList}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingList ? "animate-spin text-orange-400" : ""}`} />
                Refresh List
              </button>
            </div>

            {isLoadingList ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-orange-400" />
                <p className="text-sm mt-2">Loading question bank...</p>
              </div>
            ) : filteredBank.length > 0 ? (
              <div className="space-y-3">
                {filteredBank.map((q, idx) => (
                  <div key={q.questionId || idx} className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-500">#{idx + 1}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 font-semibold uppercase">
                          {q.subject}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10 font-semibold uppercase">
                          {q.type}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${
                            q.difficulty === "easy"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : q.difficulty === "hard"
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">Marks: {q.marks}</span>
                      </div>

                      {canEmbed && (
                        <button
                          onClick={() => handleDelete(q)}
                          className="text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                          title="Delete question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-200 leading-relaxed">{q.question}</p>

                    {q.topic || q.subtopic ? (
                      <p className="text-[11px] text-gray-500 font-mono">
                        {q.topic || "—"} {q.subtopic ? `/ ${q.subtopic}` : ""}
                      </p>
                    ) : null}

                    {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, oi) => {
                          const letter = String.fromCharCode(65 + oi);
                          const isCorrect = q.correct_option === letter || (q.correct_option && q.correct_option === opt);
                          return (
                            <div
                              key={oi}
                              className={`text-xs px-3 py-1.5 rounded-lg border ${
                                isCorrect
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : "bg-white/5 border-white/10 text-gray-400"
                              }`}
                            >
                              <span className="font-bold mr-1.5">{letter}.</span>
                              {opt}
                              {isCorrect && <CheckCircle2 className="h-3 w-3 inline ml-1 text-emerald-400" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                <p className="text-sm">
                  {listSearch ? "No questions match your search." : "The question bank is empty. Add questions from the 'Add Question' tab."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}