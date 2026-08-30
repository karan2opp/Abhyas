"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, FileText, Database, Search, CheckCircle2, AlertCircle, RefreshCw, Layers, Sparkles, X, FileCode, BookOpen, Bot } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import RagChatView from "@/components/RagChatView";
import { 
  uploadKnowledgeDocumentService, 
  getKnowledgeCollectionsService, 
  queryKnowledgeChunksService,
  IndexResponse,
  CollectionItem,
  ChunkItem
} from "@/services/knowledge.service";

const QUICK_SUBJECTS = ["JavaScript", "Python", "Tally", "React", "Database", "Operating Systems"];

export default function KnowledgeUploadView() {
  const role = useAuthStore((state) => state.user?.role);
  const canEmbed = role === "manager" || role === "system_admin";
  const [activeTab, setActiveTab] = useState<"upload" | "collections" | "playground" | "chat">(canEmbed ? "upload" : "collections");

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<IndexResponse["data"] | null>(null);
  const [uploadResultMsg, setUploadResultMsg] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collections State
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState<boolean>(false);
  const [collectionSearch, setCollectionSearch] = useState<string>("");

  // Search Playground State
  const [searchSubject, setSearchSubject] = useState<string>("");
  const [searchTopic, setSearchTopic] = useState<string>("");
  const [topK, setTopK] = useState<number>(5);
  const [searchResults, setSearchResults] = useState<ChunkItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Load collections when opening Collections or Playground tabs
  const fetchCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const data = await getKnowledgeCollectionsService();
      setCollections(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load Qdrant collections");
    } finally {
      setIsLoadingCollections(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // File Handlers
  const handleFileSelect = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "md" && ext !== "markdown" && ext !== "txt") {
      toast.error("Only PDF (.pdf) and Markdown (.md) files are supported.");
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20 MB limit.");
      return;
    }
    setFile(selectedFile);
    setUploadResult(null);

    // Auto-fill topic from file name if topic is empty
    if (!topic) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      setTopic(baseName);
    }
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

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a PDF or Markdown file.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadKnowledgeDocumentService(file, subject.trim(), topic.trim());
      setUploadResult(res.data);
      setUploadResultMsg(res.message);
      if (res.data.indexed) {
        toast.success(`Document indexed! ${res.data.chunksIndexed} chunk(s) stored in Qdrant.`);
      } else {
        toast.info("Document already indexed in Qdrant (Duplicate SHA-256 hash).");
      }
      fetchCollections(); // Refresh collection list
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to embed document in Qdrant.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Run Playground Search
  const handlePlaygroundSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSubject.trim()) {
      toast.error("Subject is required to query Qdrant.");
      return;
    }
    if (!searchTopic.trim()) {
      toast.error("Topic is required to query Qdrant.");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await queryKnowledgeChunksService(
        searchSubject.trim(),
        searchTopic.trim(),
        "",
        topK
      );
      setSearchResults(results);
      if (results.length === 0) {
        toast.info("No matching vector chunks found in Qdrant for this topic.");
      } else {
        toast.success(`Retrieved ${results.length} relevant chunk(s) from Qdrant.`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to query Qdrant vector store.");
    } finally {
      setIsSearching(false);
    }
  };

  // Filter collections
  const filteredCollections = collections.filter(c => 
    c.subject.toLowerCase().includes(collectionSearch.toLowerCase()) ||
    c.topic.toLowerCase().includes(collectionSearch.toLowerCase())
  );

  const totalChunksCount = collections.reduce((acc, c) => acc + c.count, 0);

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
                <h1 className="text-2xl font-bold text-white tracking-tight">Qdrant Vector Store Manager</h1>
                <p className="text-sm text-gray-400">Upload PDF & Markdown documents to generate OpenAI embeddings into Qdrant vector database.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-4 py-2 rounded-xl shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-gray-300">Qdrant Collection: <strong className="text-orange-400 font-semibold">exams</strong></span>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
          {canEmbed && (
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
                activeTab === "upload"
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40 font-semibold"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              Upload & Embed Document
            </button>
          )}

          <button
            onClick={() => setActiveTab("collections")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
              activeTab === "collections"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40 font-semibold"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="h-4 w-4" />
            Indexed Collections ({collections.length})
          </button>

          <button
            onClick={() => setActiveTab("playground")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
              activeTab === "playground"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40 font-semibold"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Search className="h-4 w-4" />
            Vector Similarity Tester
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
              activeTab === "chat"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40 font-semibold"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bot className="h-4 w-4" />
            RAG Chatbot
          </button>
        </div>
      </div>

      {/* ── TAB 1: UPLOAD & EMBED DOCUMENT ─────────────────────────────────────── */}
      {activeTab === "upload" && canEmbed && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="lg:col-span-7 bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-orange-400" />
              Upload & Vectorize File
            </h2>

            <form onSubmit={handleUploadSubmit} className="space-y-5">
              {/* Drag & Drop File Zone */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Document File (.pdf or .md)
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
                    accept=".pdf,.md,.markdown,.txt"
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
                          {file.name.endsWith(".pdf") ? <FileText className="h-6 w-6" /> : <FileCode className="h-6 w-6" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.name.split('.').pop()?.toUpperCase()}
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
                        Supports <strong className="text-gray-200">PDF (.pdf)</strong> and <strong className="text-gray-200">Markdown (.md)</strong> files up to 20 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Input */}
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

                {/* Quick Subject Chips */}
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

              {/* Topic Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Topic Name (Recommended)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Async Await, Variables"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || !file || !subject.trim()}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-all"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Extracting Chunks & Embedding into Qdrant...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Upload & Embed Document into Qdrant
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Side */}
          <div className="lg:col-span-5 space-y-6">
            {/* Status Card */}
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-full">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-400" />
                Indexing Status & Pipeline Details
              </h3>

              {uploadResult ? (
                <div className="space-y-4 flex-1">
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    uploadResult.indexed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}>
                    {uploadResult.indexed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm leading-snug">
                        {uploadResult.indexed ? "Successfully Vectorized & Indexed!" : "Document Already Indexed"}
                      </h4>
                      <p className="text-xs opacity-90 mt-1">{uploadResultMsg}</p>
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="bg-black/60 border border-white/10 rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-400">Subject</span>
                      <span className="font-semibold text-white">{uploadResult.subject}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-400">Topic</span>
                      <span className="font-semibold text-white">{uploadResult.topic || "Default"}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-400">Vector Chunks Stored</span>
                      <span className="font-bold text-orange-400 text-sm">{uploadResult.chunksIndexed ?? 0} Chunks</span>
                    </div>

                    <div className="pt-1">
                      <span className="text-gray-400 block mb-1">SHA-256 Hash</span>
                      <code className="text-[11px] font-mono bg-white/5 p-1.5 rounded text-gray-300 block truncate border border-white/5">
                        {uploadResult.fileHash}
                      </code>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-black/30 text-gray-400 space-y-3">
                  <FileText className="h-10 w-10 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-white">No active index operation</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Select a file and click "Upload & Embed" to see real-time vector embedding stats.
                    </p>
                  </div>
                </div>
              )}

              {/* RAG Pipeline Specs */}
              <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Embeddings Model: <strong className="text-gray-200 font-mono">text-embedding-3-small (1536d)</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Metric: <strong className="text-gray-200 font-mono">Cosine Distance</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Deduplication: <strong className="text-gray-200 font-mono">SHA-256 Payload Hash Matching</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: INDEXED COLLECTIONS ────────────────────────────────────────── */}
      {activeTab === "collections" && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Indexed Topics</span>
              <p className="text-2xl font-bold text-white mt-1">{collections.length}</p>
            </div>

            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Vector Chunks</span>
              <p className="text-2xl font-bold text-orange-400 mt-1">{totalChunksCount}</p>
            </div>

            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Qdrant Collection</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">exams</p>
            </div>
          </div>

          {/* Collections Table & Search */}
          <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search subject or topic..."
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:border-orange-500 outline-none"
                />
              </div>

              <button
                onClick={fetchCollections}
                disabled={isLoadingCollections}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCollections ? "animate-spin text-orange-400" : ""}`} />
                Refresh List
              </button>
            </div>

            {filteredCollections.length > 0 ? (
              <div className="overflow-x-auto overflow-y-auto max-h-[480px] border border-white/10 rounded-xl custom-scrollbar">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-black text-gray-400 text-xs uppercase tracking-wider border-b border-white/10 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 font-semibold">Subject</th>
                      <th className="p-4 font-semibold">Topic</th>
                      <th className="p-4 font-semibold text-right">Chunks Count</th>
                      <th className="p-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/40">
                    {filteredCollections.map((col, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-white">
                          <div className="flex items-center gap-2 min-w-0">
                            <BookOpen className="h-4 w-4 text-orange-400 shrink-0" />
                            <span className="break-words min-w-0">{col.subject}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300 break-words">{col.topic}</td>
                        <td className="p-4 text-right font-mono font-bold text-orange-400 whitespace-nowrap">
                          {col.count} chunk{col.count > 1 ? "s" : ""}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSearchSubject(col.subject);
                              setSearchTopic(col.topic);
                              setActiveTab("playground");
                            }}
                            className="text-xs text-orange-400 hover:text-orange-300 hover:underline font-semibold"
                          >
                            Test Search &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                <p className="text-sm">No indexed collections found in Qdrant.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: VECTOR SIMILARITY SEARCH TESTER ────────────────────────────── */}
      {activeTab === "playground" && (
        <div className="space-y-6">
          <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-orange-400" />
              Vector Similarity Search Tester
            </h2>

            <form onSubmit={handlePlaygroundSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Filter Subject <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JavaScript"
                    value={searchSubject}
                    onChange={(e) => setSearchSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Filter Topic <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Async Await"
                    value={searchTopic}
                    onChange={(e) => setSearchTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Top-K Chunks:</span>
                  {[3, 5, 10].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTopK(k)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all ${
                        topK === k
                          ? "bg-orange-600 text-white border-orange-500 font-bold"
                          : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !searchSubject || !searchTopic}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-orange-950/40 flex items-center gap-2 transition-all"
                >
                  {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Query Qdrant Vector Store
                </button>
              </div>
            </form>
          </div>

          {/* Search Results Display */}
          {hasSearched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Retrieved Chunks ({searchResults.length})
                </h3>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((chunk, idx) => (
                    <div key={idx} className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-xs">
                            #{idx + 1}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            Source: <strong className="text-gray-200">{chunk.sourceFile || "Document"}</strong>
                          </span>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold px-3 py-1 rounded-full">
                          Similarity Score: {(chunk.score * 100).toFixed(1)}%
                        </div>
                      </div>

                      <div className="bg-black/60 border border-white/5 rounded-xl p-4 text-xs font-mono text-gray-200 whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                        {chunk.text}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl bg-[#09090b]">
                  <p className="text-sm font-medium text-white">No relevant chunks returned</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try uploading a document for this subject & topic first, or broaden your search query.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: RAG CHATBOT ───────────────────────────────────────────────── */}
      {activeTab === "chat" && <RagChatView />}
    </div>
  );
}
