import fs from "fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ApiError } from "../../../common/utils/ApiError.js";
import { splitTextIntoChunks } from "./text-utils.js";
import type { ChunkedDocument, ParentChunk, ChildChunk } from "./chunk-types.js";

interface TextSpan {
  str: string;
  fontSize: number;
  isBold: boolean;
  x: number;
  y: number;
  page: number;
}

interface PdfLine {
  text: string;
  fontSize: number;
  isBold: boolean;
  page: number;
}

interface BodyLine {
  text: string;
  page: number;
}

interface HeadingNode {
  heading: string;
  level: number;
  lines: BodyLine[];
  children: HeadingNode[];
}

const HEADING_MAX_LEN = 150;
const BOLD_RE = /bold|black|semibold|demibold/i;
const NUMERIC_ONLY_RE = /^[\d\s\-–—.]+$/;
const Y_BUCKET_TOLERANCE = 3;

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** Extracts text lines with per-line font size and boldness from a PDF. */
const extractPdfLines = async (filePath: string): Promise<PdfLine[]> => {
  const buf = fs.readFileSync(filePath);
  const pdf = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;

  const lines: PdfLine[] = [];
  try {
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);

      // Resolve the real font names (e.g. "Helvetica-Bold") for bold detection.
      const fontNames = new Map<string, string>();
      const opList = await page.getOperatorList();
      for (let i = 0; i < opList.fnArray.length; i++) {
        if (opList.fnArray[i] !== OPS.setFont) continue;
        const name = opList.argsArray[i]?.[0];
        if (typeof name !== "string" || fontNames.has(name)) continue;
        try {
          const font = await page.commonObjs.get(name);
          fontNames.set(name, (font as { name?: string } | null)?.name ?? "");
        } catch {
          fontNames.set(name, "");
        }
      }

      const content = await page.getTextContent();
      const spans: TextSpan[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const str = (item as { str: string }).str.trim();
        if (!str) continue;
        const transform = (item as { transform: number[] }).transform;
        const fontName = (item as { fontName: string }).fontName;
        spans.push({
          str,
          fontSize: Math.abs(transform[0]!),
          isBold: BOLD_RE.test(fontNames.get(fontName) ?? ""),
          x: transform[4]!,
          y: transform[5]!,
          page: pageNo,
        });
      }

      // Group spans on the same baseline into lines (top-to-bottom, left-to-right).
      const buckets: TextSpan[][] = [];
      for (const span of spans) {
        let bucket: TextSpan[] | undefined;
        for (const b of buckets) {
          if (Math.abs(b[0]!.y - span.y) <= Y_BUCKET_TOLERANCE) {
            bucket = b;
            break;
          }
        }
        if (!bucket) {
          bucket = [];
          buckets.push(bucket);
        }
        bucket.push(span);
      }

      buckets.sort((a, b) => b[0]!.y - a[0]!.y);
      for (const bucket of buckets) {
        bucket.sort((a, b) => a.x - b.x);
        const text = bucket.map((s) => s.str).join("").trim();
        if (!text) continue;
        lines.push({
          text,
          fontSize: Math.max(...bucket.map((s) => s.fontSize)),
          isBold: bucket.some((s) => s.isBold),
          page: pageNo,
        });
      }
    }
  } finally {
    await pdf.destroy();
  }

  return lines;
};

export const chunkPdf = async (filePath: string, fileName: string): Promise<ChunkedDocument> => {
  let allLines: PdfLine[];
  try {
    allLines = await extractPdfLines(filePath);
  } catch (err) {
    console.error("PDF parsing failed:", err);
    throw ApiError.badRequest("Failed to parse PDF file. Ensure it is a valid, unencrypted PDF.");
  }

  if (allLines.length === 0) {
    throw ApiError.badRequest("PDF contains no readable text content.");
  }

  const parents: ParentChunk[] = [];
  const children: ChildChunk[] = [];
  let seq = 0;

  // Splits body lines into ~500-token children, grouped per page so each child
  // can be attributed to the exact page it came from.
  const addChildren = (
    parentKey: string,
    heading: string,
    lines: BodyLine[],
    partState: { value: number }
  ): void => {
    const byPage = new Map<number, string[]>();
    for (const line of lines) {
      const list = byPage.get(line.page) ?? [];
      list.push(line.text);
      byPage.set(line.page, list);
    }
    for (const [page, texts] of byPage) {
      const pageText = texts.join("\n").trim();
      if (!pageText) continue;
      for (const text of splitTextIntoChunks(pageText)) {
        children.push({ parentKey, heading, part: partState.value++, text, page });
      }
    }
  };

  // ── Fallback: no detectable headings → one parent per page ───────────────
  const bodyMedian = median(allLines.map((l) => l.fontSize));
  const headingCandidates = allLines.filter((l) => {
    if (l.fontSize < 7) return false;
    if (l.text.length < 3 || l.text.length > HEADING_MAX_LEN) return false;
    if (NUMERIC_ONLY_RE.test(l.text)) return false;
    return l.fontSize >= Math.max(bodyMedian * 1.25, bodyMedian + 1.5) ||
      (l.isBold && l.fontSize >= bodyMedian);
  });

  if (headingCandidates.length === 0) {
    const byPage = new Map<number, PdfLine[]>();
    for (const line of allLines) {
      const list = byPage.get(line.page) ?? [];
      list.push(line);
      byPage.set(line.page, list);
    }
    for (const [page, pageLines] of byPage) {
      const key = `p${seq++}`;
      const heading = `Page ${page}`;
      const body = pageLines.map((l) => l.text).join("\n").trim();
      if (!body) continue;
      parents.push({ key, heading, text: `Page ${page}\n\n${body}` });
      addChildren(key, heading, pageLines, { value: 0 });
    }
    if (parents.length === 0) {
      throw ApiError.badRequest("PDF contains no readable text content.");
    }
    return { parents, children };
  }

  // ── Heading detection → build the heading tree ────────────────────────────
  const sizeRanks = new Map<number, number>();
  [...new Set(headingCandidates.map((l) => l.fontSize))]
    .sort((a, b) => b - a)
    .forEach((size, i) => sizeRanks.set(size, i));

  const root: HeadingNode = { heading: "", level: -1, lines: [], children: [] };
  const stack: HeadingNode[] = [root];

  for (const line of allLines) {
    const isHeading =
      line.fontSize >= 7 &&
      line.text.length >= 3 &&
      line.text.length <= HEADING_MAX_LEN &&
      !NUMERIC_ONLY_RE.test(line.text) &&
      (line.fontSize >= Math.max(bodyMedian * 1.25, bodyMedian + 1.5) ||
        (line.isBold && line.fontSize >= bodyMedian));

    if (isHeading) {
      const level = sizeRanks.get(line.fontSize) ?? 0;
      while (stack.length > 1 && stack[stack.length - 1]!.level >= level) stack.pop();
      const node: HeadingNode = { heading: line.text, level, lines: [], children: [] };
      stack[stack.length - 1]!.children.push(node);
      stack.push(node);
    } else {
      stack[stack.length - 1]!.lines.push({ text: line.text, page: line.page });
    }
  }

  // Intro body before the first detected heading becomes its own parent.
  const introLines = root.lines;
  if (introLines.length > 0) {
    const key = `p${seq++}`;
    const heading = "Introduction";
    parents.push({ key, heading, text: introLines.map((l) => l.text).join("\n").trim() });
    addChildren(key, heading, introLines, { value: 0 });
  }

  const nodeText = (node: HeadingNode): string => {
    const body = node.lines.map((l) => l.text).join("\n").trim();
    const nested = node.children.map((c) => nodeText(c)).filter((t) => t.trim().length > 0);
    return [node.heading, body, ...nested].filter((s) => s.trim().length > 0).join("\n\n");
  };

  const visit = (node: HeadingNode): void => {
    const key = `p${seq++}`;
    parents.push({ key, heading: node.heading, text: nodeText(node) });

    addChildren(key, node.heading, node.lines, { value: 0 });
    for (const child of node.children) visit(child);
  };

  for (const child of root.children) visit(child);

  if (parents.length === 0) {
    throw ApiError.badRequest("PDF produced no chunkable sections.");
  }

  return { parents, children };
};