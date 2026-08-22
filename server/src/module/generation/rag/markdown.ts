import fs from "fs";
import { Document } from "@langchain/core/documents";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { ApiError } from "../../../common/utils/ApiError.js";

const TASKS_HEADING = /^##\s+Tasks\b/m;
const SOURCE_LINE = /^\s*>\s*Source:\s*.+$/gm;
const IMPORTANCE_LINE = /^\s*importance:\s*\d+\s*$/gm;
const LINK = /\[([^\]]*)\]\(([^)]*)\)/g;
const HTML_DOC_START = /^\s*<!DOCTYPE\s+html/i;

export const cleanMarkdown = (raw: string): string => {
  let content = raw;

  // Strip everything from the "## Tasks" section onward (solved exercises).
  const tasksIndex = content.search(TASKS_HEADING);
  if (tasksIndex !== -1) {
    content = content.slice(0, tasksIndex);
  }

  content = content.replace(SOURCE_LINE, "");
  content = content.replace(IMPORTANCE_LINE, "");
  content = content.replace(LINK, "$1");

  // Remove full-page HTML demo scaffolding blocks (no semantic content).
  content = content.replace(/```[^\n]*\n([\s\S]*?)```/g, (match, block: string) => {
    if (HTML_DOC_START.test(block)) {
      return "";
    }
    return match;
  });

  // Collapse blank-line runs.
  content = content.replace(/[ \t]+$/gm, "");
  content = content.replace(/\n{3,}/g, "\n\n");

  return content.trim();
};

export const loadMarkdownChunks = async (
  filePath: string,
  originalFileName: string,
  subject: string,
  topic?: string,
  subtopic?: string,
  fileHash?: string,
  organisationId?: string | null
): Promise<Document[]> => {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (readError) {
    console.error("Failed to read markdown file:", readError);
    throw ApiError.badRequest("Failed to read markdown file.");
  }

  const cleaned = cleanMarkdown(raw);
  if (cleaned.length === 0) {
    throw ApiError.badRequest("Markdown file contains no readable content.");
  }

  const splitter = new MarkdownTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });
  const texts = await splitter.splitText(cleaned);

  if (texts.length === 0) {
    throw ApiError.badRequest("Markdown file produced no chunks.");
  }

  const timestamp = Date.now();
  return texts
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text) => {
      return new Document({
        pageContent: text,
        metadata: {
          subject: subject.trim(),
          topic: topic ? topic.trim() : "",
          subtopic: subtopic ? subtopic.trim() : "",
          sourceFile: originalFileName,
          fileHash: fileHash || "",
          indexedAt: timestamp,
          docType: "markdown",
          organisationId: organisationId || "",
        },
      });
    });
};
