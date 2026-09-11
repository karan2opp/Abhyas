"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, Search, RefreshCw, Library, CheckCircle2, XCircle, Clock, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  uploadQuestionBankDocument,
  listQuestionBankDocuments,
  renameQuestionBankDocument,
  deleteQuestionBankDocument,
  searchQuestionBank,
  QuestionBankDocument,
  QuestionBankSearchResult,
} from "@/services/questionBank.service";

function StatusBadge({ status }: { status: QuestionBankDocument["status"] }) {
  const map = {
    pending: { icon: Clock, cls: "bg-zinc-500/10 text-zinc-500 ring-zinc-500/30" },
    processing: { icon: Loader2, cls: "bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400", spin: true },
    completed: { icon: CheckCircle2, cls: "bg-green-500/10 text-green-600 ring-green-500/30 dark:text-green-400" },
    failed: { icon: XCircle, cls: "bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400" },
  } as const;
  const { icon: Icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      <Icon className={`size-3 ${status === "processing" ? "animate-spin" : ""}`} /> {status}
    </span>
  );
}

function ResultCard({ result }: { result: QuestionBankSearchResult }) {
  const { chunk, score } = result;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{chunk.questionNumber ? `Q${chunk.questionNumber}` : "Question"}</CardTitle>
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600 ring-1 ring-orange-500/30 dark:text-orange-400">
            score {score.toFixed(3)}
          </span>
          {chunk.subject && (
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 ring-1 ring-purple-500/30 dark:text-purple-400">
              {chunk.subject}
            </span>
          )}
          {(chunk.topics || []).map((t) => (
            <span key={t} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-500/30 dark:text-blue-400">
              {t}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {chunk.description && <p className="text-xs italic text-muted-foreground">{chunk.description}</p>}

        <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-xs whitespace-pre-wrap">{chunk.rawText}</pre>

        {chunk.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chunk.images.map((img, i) => (
              <img key={i} src={img.url} alt={`Q${chunk.questionNumber} image ${i}`} className="max-h-28 max-w-36 rounded-md border border-border object-contain" />
            ))}
          </div>
        )}

        {chunk.tables.length > 0 && (
          <div className="flex flex-col gap-2">
            {chunk.tables.map((table, i) => (
              <div key={i} className="overflow-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs">
                  {table.header && (
                    <thead>
                      <tr className="bg-muted/70">
                        {table.header.map((h, hi) => (
                          <th key={hi} className="border border-border px-2 py-1 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-border px-2 py-1">{cell ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground">pages {chunk.pageStart}–{chunk.pageEnd}</div>
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  doc,
  onRenamed,
  onDeleted,
}: {
  doc: QuestionBankDocument;
  onRenamed: (doc: QuestionBankDocument) => void;
  onDeleted: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const saveTitle = async () => {
    const title = titleDraft.trim();
    if (!title || title === doc.title) {
      setIsEditing(false);
      setTitleDraft(doc.title);
      return;
    }
    setIsSaving(true);
    try {
      const updated = await renameQuestionBankDocument(doc.id, title);
      onRenamed(updated);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Rename failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.title}"? This removes all its extracted questions too.`)) return;
    setIsDeleting(true);
    try {
      await deleteQuestionBankDocument(doc.id);
      onDeleted(doc.id);
      toast.success("Document deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
      <div className="flex min-w-0 flex-1 flex-col">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setTitleDraft(doc.title);
                }
              }}
              className="h-7 max-w-72"
            />
            <Button variant="ghost" size="icon-sm" onClick={saveTitle} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setIsEditing(false);
                setTitleDraft(doc.title);
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{doc.title}</span>
            <button title="Rename" onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground">
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
        {doc.status === "failed" && doc.error && <span className="text-xs text-red-500">{doc.error}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{doc.totalChunks} question(s)</span>
        <StatusBadge status={doc.status} />
        <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isDeleting} title="Delete document">
          {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-red-500" />}
        </Button>
      </div>
    </div>
  );
}

export default function QuestionBankLab() {
  const [documents, setDocuments] = useState<QuestionBankDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<QuestionBankSearchResult[] | null>(null);

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await listQuestionBankDocuments();
      setDocuments(docs);
      return docs;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load documents");
      return [];
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    const hasPending = documents.some((d) => d.status === "pending" || d.status === "processing");
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(refreshDocuments, 4000);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [documents, refreshDocuments]);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a PDF file first");
      return;
    }
    setIsUploading(true);
    try {
      await uploadQuestionBankDocument(file, docName);
      toast.success("Upload started — processing in the background");
      setFile(null);
      setDocName("");
      await refreshDocuments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Enter a search query");
      return;
    }
    setIsSearching(true);
    setResults(null);
    try {
      const data = await searchQuestionBank(query.trim(), subject.trim() ? { subject: subject.trim() } : {});
      setResults(data);
      if (data.length === 0) toast.message("No matching questions found");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Library className="size-5" /> Question Bank Lab
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a previous-year question paper, let it get chunked/classified/embedded in the background, then
            semantically search it and see the verbatim original questions come back.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload a PDF</CardTitle>
            <CardDescription>Each upload runs the extract → chunk → classify → embed pipeline asynchronously.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted/50">
              <FileUp className="size-4" />
              {file ? file.name : "Choose a PDF file"}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <Input
              placeholder="Document name (optional, defaults to filename)"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="max-w-72"
            />
            <Button onClick={handleUpload} disabled={isUploading || !file}>
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading...
                </>
              ) : (
                "Upload & Process"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Your uploads and their pipeline status.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshDocuments}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-xs italic text-muted-foreground">No documents uploaded yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onRenamed={(updated) => setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))}
                    onDeleted={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
            <CardDescription>Semantic search over every completed document's questions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="e.g. projectile motion maximum height"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="min-w-64 flex-1"
              />
              <Input
                placeholder="Subject filter (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-48"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <div className="flex flex-col gap-4">
            {results.map((r) => (
              <ResultCard key={r.chunk.id} result={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
