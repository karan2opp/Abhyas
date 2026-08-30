import crypto from "crypto";
import { parse as parseYaml } from "yaml";
import { ApiError } from "../../../common/utils/ApiError.js";
import type { CuratedQuestion } from "./types.js";

const OPTION_LINE = /^\s*-\s*\[([ xX])\]\s*(.+)$/;
const FRONTMATTER_BLOCK = /^\s*---\s*\n([\s\S]*?)\n---\s*\n?/gm;

interface QuestionData {
  topic: string;
  subtopic: string;
  type: "mcq" | "descriptive";
  question: string;
  marks: number;
  options?: string[] | undefined;
  correctOption?: string | undefined;
  rubric?: CuratedQuestion["rubric"] | undefined;
}

function makeQuestionId(fields: { topic: string; subtopic: string; type: string; question: string }): string {
  return crypto
    .createHash("sha256")
    .update(`${fields.topic}|${fields.subtopic}|${fields.type}|${fields.question}`)
    .digest("hex");
}

// Validate + normalize the common metadata shared by all input formats.
// `topic` is the one hard requirement (retrieval is topic-scoped); subtopic is
// optional — retrieval relies on semantic similarity instead.
function validateCommon(data: any, sourceFile: string) {
  const topic = (data.topic || "").trim();
  const subtopic = (data.subtopic || "").trim();
  const type = (data.type || "").trim().toLowerCase();

  if (!topic) {
    throw ApiError.badRequest(
      `Curated question in "${sourceFile}" must define a topic.`
    );
  }
  if (type !== "mcq" && type !== "descriptive") {
    throw ApiError.badRequest(
      `Curated question in "${sourceFile}" has invalid type "${type}" (expected "mcq" or "descriptive").`
    );
  }

  return { topic, subtopic, type };
}

function buildCuratedQuestion(data: QuestionData, sourceFile: string): CuratedQuestion {
  const result: CuratedQuestion = {
    questionId: makeQuestionId({
      topic: data.topic,
      subtopic: data.subtopic,
      type: data.type,
      question: data.question,
    }),
    topic: data.topic,
    subtopic: data.subtopic,
    type: data.type,
    question: data.question,
    marks: data.marks,
    source: sourceFile,
  };
  if (data.options) result.options = data.options;
  if (data.correctOption) result.correctOption = data.correctOption;
  if (data.rubric) result.rubric = data.rubric;
  return result;
}

function parseRubric(rubric: any): CuratedQuestion["rubric"] {
  if (!rubric) return undefined;
  return {
    categories: (rubric.categories || rubric).map((r: any) => ({
      name: r.name,
      weight: r.weight,
      key_points: r.key_points ?? [],
    })),
  };
}

// Parse the question body (used by the Markdown format) for MCQ options.
function parseMarkdownBody(body: string, type: string, sourceFile: string): { question: string; options?: string[]; correctOption?: string } {
  if (type !== "mcq") return { question: body.trim() };

  const lines = body.split("\n").map((l) => l.trim());
  const questionLines: string[] = [];
  const parsedOptions: { text: string; correct: boolean }[] = [];

  for (const line of lines) {
    const m = line.match(OPTION_LINE);
    if (m) {
      parsedOptions.push({ text: m[2]!.trim(), correct: m[1]!.toLowerCase() === "x" });
    } else if (parsedOptions.length === 0) {
      questionLines.push(line);
    }
  }

  if (parsedOptions.length !== 4) {
    throw ApiError.badRequest(`Curated MCQ "${sourceFile}" must have exactly 4 options.`);
  }
  const correctIdx = parsedOptions.findIndex((o) => o.correct);
  if (correctIdx === -1) {
    throw ApiError.badRequest(`Curated MCQ "${sourceFile}" must mark exactly one option as correct with - [x].`);
  }

  return {
    question: questionLines.join("\n").trim(),
    options: parsedOptions.map((o) => o.text),
    correctOption: String.fromCharCode(65 + correctIdx),
  };
}

// From a JSON batch entry (has `question`/`options`/`correctOption` fields).
function parseJsonQuestion(obj: any, sourceFile: string): CuratedQuestion {
  const common = validateCommon(obj, sourceFile);
  const question = (obj.question || "").trim();
  if (!question) {
    throw ApiError.badRequest(`Curated question in "${sourceFile}" has no question text.`);
  }

  const marks = typeof obj.marks === "number" ? obj.marks : 1;

  let options: string[] | undefined;
  let correctOption: string | undefined;
  if (common.type === "mcq") {
    if (!Array.isArray(obj.options) || obj.options.length !== 4) {
      throw ApiError.badRequest(`Curated MCQ in "${sourceFile}" must have exactly 4 options.`);
    }
    const opts: string[] = obj.options.map(String);
    const correctIdx = opts.findIndex((o: string) => o === obj.correctOption || o === obj.correct_option);
    if (correctIdx === -1) {
      throw ApiError.badRequest(`Curated MCQ in "${sourceFile}" correctOption must match one of the options.`);
    }
    options = opts;
    correctOption = String.fromCharCode(65 + correctIdx);
  }

  return buildCuratedQuestion(
    { ...common, question, marks, options, correctOption, rubric: parseRubric(obj.rubric) },
    sourceFile
  );
}

// From a Markdown frontmatter block + body.
function parseMarkdownQuestion(frontmatter: any, body: string, sourceFile: string): CuratedQuestion {
  const common = validateCommon(frontmatter, sourceFile);
  const marks = typeof frontmatter.marks === "number" ? frontmatter.marks : 1;
  const parsedBody = parseMarkdownBody(body, common.type, sourceFile);

  return buildCuratedQuestion(
    {
      ...common,
      question: parsedBody.question,
      marks,
      options: parsedBody.options,
      correctOption: parsedBody.correctOption,
      rubric: parseRubric(frontmatter.rubric),
    },
    sourceFile
  );
}

/**
 * Parses a curated-question file into one or more questions. Supports:
 *
 * 1. JSON batch file — an array of question objects:
 *    [{ topic, subtopic, type, question, marks,
 *       options[], correctOption, rubric }]
 *
 * 2. Markdown list — one or more frontmatter blocks, each followed by its body:
 *    ---
 *    topic: Variables
 *    subtopic: Variable Scope
 *    type: mcq
 *    marks: 1
 *    ---
 *    Question text...
 *    - [ ] Wrong option
 *    - [x] Correct option
 *
 *    ---
 *    (next question...)
 *    ---
 */
export const parseCuratedQuestions = (content: string, sourceFile: string): CuratedQuestion[] => {
  const trimmed = content.trim();

  // JSON batch format
  if (trimmed.startsWith("[")) {
    let arr: any[];
    try {
      arr = JSON.parse(trimmed);
    } catch (e: any) {
      throw ApiError.badRequest(`Invalid JSON in "${sourceFile}": ${e?.message || e}`);
    }
    if (!Array.isArray(arr)) {
      throw ApiError.badRequest(`JSON batch in "${sourceFile}" must be an array.`);
    }
    return arr.map((q) => parseJsonQuestion(q, sourceFile));
  }

  if (trimmed.startsWith("{")) {
    let obj: any;
    try {
      obj = JSON.parse(trimmed);
    } catch (e: any) {
      throw ApiError.badRequest(`Invalid JSON in "${sourceFile}": ${e?.message || e}`);
    }
    return [parseJsonQuestion(obj, sourceFile)];
  }

  // Markdown list format
  const blocks: { yaml: string; start: number; end: number }[] = [];
  FRONTMATTER_BLOCK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FRONTMATTER_BLOCK.exec(trimmed)) !== null) {
    blocks.push({ yaml: match[1]!, start: match.index, end: match.index + match[0].length });
  }

  if (blocks.length === 0) {
    throw ApiError.badRequest(`Curated question "${sourceFile}" is missing YAML frontmatter (--- ... ---).`);
  }

  const questions: CuratedQuestion[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const next = blocks[i + 1];
    const body = trimmed.slice(block.end, next ? next.start : undefined).trim();
    if (!body) {
      throw ApiError.badRequest(`Curated question "${sourceFile}" has no question text after frontmatter #${i + 1}.`);
    }
    let frontmatter: any;
    try {
      frontmatter = parseYaml(block.yaml);
    } catch (e: any) {
      throw ApiError.badRequest(`Invalid YAML frontmatter in "${sourceFile}": ${e?.message || e}`);
    }
    questions.push(parseMarkdownQuestion(frontmatter, body, sourceFile));
  }

  return questions;
};

/** Parses a single-question file (first question of the file). */
export const parseCuratedQuestion = (content: string, sourceFile: string): CuratedQuestion => {
  return parseCuratedQuestions(content, sourceFile)[0]!;
};
