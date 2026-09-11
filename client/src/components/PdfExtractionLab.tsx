"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, Copy, ChevronDown, ChevronUp, ScanEye, FileScan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { extractPdfLab, PdfLabPage, PdfLabResult } from "@/services/pdfLab.service";

function SourceBadge({ source }: { source: "pymupdf" | "vision" }) {
  if (source === "vision") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 ring-1 ring-purple-500/30 dark:text-purple-400">
        <ScanEye className="size-3" /> Vision model
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-500/30 dark:text-blue-400">
      <FileScan className="size-3" /> PyMuPDF
    </span>
  );
}

function PageCard({ page }: { page: PdfLabPage }) {
  const [expanded, setExpanded] = useState(true);
  const [showRender, setShowRender] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>Page {page.page}</CardTitle>
          <SourceBadge source={page.source} />
          <span className="text-xs text-muted-foreground">
            {page.hasTextLayer ? "has text layer" : "no text layer (scanned)"}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </CardHeader>

      {expanded && (
        <CardContent className="flex flex-col gap-4">
          {page.pageRenderDataUrl && (
            <div>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={() => setShowRender((v) => !v)}
              >
                {showRender ? "Hide" : "Show"} rasterized page render
                {page.source === "vision" ? " (what the vision model saw)" : ""}
              </button>
              {showRender && (
                <img
                  src={page.pageRenderDataUrl}
                  alt={`Page ${page.page} render`}
                  className="mt-2 max-h-96 rounded-md border border-border object-contain"
                />
              )}
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Text</div>
            {page.text.trim() ? (
              <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-2 text-xs whitespace-pre-wrap">
                {page.text}
              </pre>
            ) : (
              <div className="text-xs italic text-muted-foreground">No text extracted</div>
            )}
          </div>

          {page.images.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">
                Images ({page.images.length})
              </div>
              <div className="flex flex-wrap gap-3">
                {page.images.map((img) => (
                  <div key={img.index} className="flex flex-col items-center gap-1">
                    <img
                      src={img.dataUrl}
                      alt={`Page ${page.page} image ${img.index}`}
                      className="max-h-32 max-w-40 rounded-md border border-border object-contain"
                    />
                    <div className="flex items-center gap-1">
                      <SourceBadge source="pymupdf" />
                      <span className="text-[10px] text-muted-foreground">
                        {img.width}×{img.height} .{img.ext}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page.tables.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">
                Tables ({page.tables.length})
              </div>
              <div className="flex flex-col gap-3">
                {page.tables.map((table, i) => (
                  <div key={i} className="overflow-auto rounded-md border border-border">
                    <table className="w-full border-collapse text-xs">
                      {table.header && (
                        <thead>
                          <tr className="bg-muted/70">
                            {table.header.map((h, hi) => (
                              <th key={hi} className="border border-border px-2 py-1 text-left font-semibold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {table.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="border border-border px-2 py-1">
                                {cell ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page.lists.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">
                Lists ({page.lists.length})
              </div>
              <div className="flex flex-col gap-2">
                {page.lists.map((list, i) => (
                  <ul key={i} className="list-disc rounded-md bg-muted/50 p-2 pl-6 text-xs">
                    {list.items.map((item, ii) => (
                      <li key={ii}>{item}</li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function PdfExtractionLab() {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<PdfLabResult | null>(null);
  const [showJson, setShowJson] = useState(false);

  const jsonString = useMemo(() => (result ? JSON.stringify(result, null, 2) : ""), [result]);

  const summary = useMemo(() => {
    if (!result) return null;
    const total = result.pages.length;
    const vision = result.pages.filter((p) => p.source === "vision").length;
    return { total, vision, pymupdf: total - vision };
  }, [result]);

  const handleExtract = async () => {
    if (!file) {
      toast.error("Choose a PDF file first");
      return;
    }
    setIsExtracting(true);
    setResult(null);
    try {
      const data = await extractPdfLab(file);
      setResult(data);
      toast.success(`Extracted ${data.pages.length} page(s)`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      toast.success("JSON copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileScan className="size-5" /> PDF Extraction Lab
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a PDF to see exactly what the extraction pipeline produces per page — text, tables, lists and
          images from PyMuPDF, with a vision-model fallback for pages that have no text layer (scanned pages).
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted/50">
            <FileUp className="size-4" />
            {file ? file.name : "Choose a PDF file"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <Button onClick={handleExtract} disabled={isExtracting || !file}>
            {isExtracting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Extracting...
              </>
            ) : (
              "Extract PDF"
            )}
          </Button>
          {summary && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{summary.total} page(s)</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <SourceBadge source="pymupdf" /> {summary.pymupdf}
              </span>
              <span className="flex items-center gap-1">
                <SourceBadge source="vision" /> {summary.vision}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="flex flex-col gap-4">
            {result.pages.map((page) => (
              <PageCard key={page.page} page={page} />
            ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Raw JSON output</CardTitle>
                <CardDescription>Exactly what the /pdf-lab/extract endpoint returned.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyJson}>
                  <Copy className="size-3.5" /> Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowJson((v) => !v)}>
                  {showJson ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            {showJson && (
              <CardContent>
                <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                  {jsonString}
                </pre>
              </CardContent>
            )}
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
