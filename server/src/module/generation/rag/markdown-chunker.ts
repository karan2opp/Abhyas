import { ApiError } from "../../../common/utils/ApiError.js";
import { cleanMarkdown } from "./markdown.js";
import {
  splitTextIntoChunks,
  estimateTokens,
  CHILD_CHUNK_MAX_TOKENS,
} from "./text-utils.js";
import type { ChunkedDocument, ParentChunk, ChildChunk } from "./chunk-types.js";

interface MdSubsection {
  heading: string;
  body: string[];
}

interface MdSection {
  heading: string;
  intro: string[];
  subsections: MdSubsection[];
}

/**
 * Splits cleaned markdown into parent/child chunks. The first `#` heading is the
 * document title; every `#`/`##` heading after it starts a new parent section;
 * `###`+ headings mark subsections that become children; body text is chunked
 * into ~500-token children with ~100-token overlap.
 */
export const chunkMarkdown = (raw: string, fileName: string): ChunkedDocument => {
  const cleaned = cleanMarkdown(raw);
  if (cleaned.length === 0) {
    throw ApiError.badRequest("Markdown file contains no readable content.");
  }

  const lines = cleaned.split("\n");
  let title = "";
  let sawTitle = false;
  const intro: string[] = [];
  const sections: MdSection[] = [];
  let current: MdSection | null = null;
  let currentSub: MdSubsection | null = null;

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = h[1]!.length;
      const headingText = h[2]!.trim();

      // The first `#` heading is the document title, not a section.
      if (level === 1 && !sawTitle) {
        sawTitle = true;
        title = headingText;
        continue;
      }

      // `#` or `##` after the title starts a new parent section.
      if (level <= 2) {
        current = { heading: headingText, intro: [], subsections: [] };
        currentSub = null;
        sections.push(current);
        continue;
      }

      // `###`+ becomes a subsection (child) of the current parent.
      if (level >= 3 && current) {
        currentSub = { heading: headingText, body: [] };
        current.subsections.push(currentSub);
        continue;
      }

      // Any heading with no current section is kept as body text.
      if (currentSub) currentSub.body.push(line);
      else if (current) current.intro.push(line);
      else intro.push(line);
      continue;
    }

    if (current) {
      if (currentSub) currentSub.body.push(line);
      else current.intro.push(line);
    } else {
      intro.push(line);
    }
  }

  const parents: ParentChunk[] = [];
  const children: ChildChunk[] = [];
  let seq = 0;

  const addParentChildren = (
    parent: ParentChunk,
    heading: string,
    bodyText: string
  ): void => {
    const parts = splitTextIntoChunks(bodyText);
    parts.forEach((text, part) => {
      children.push({ parentKey: parent.key, heading, part, text });
    });
  };

  const sectionBody = (section: MdSection): string => {
    const introText = section.intro.join("\n").trim();
    const subTexts = section.subsections
      .map((sub) => {
        const body = sub.body.join("\n").trim();
        return body ? `### ${sub.heading}\n\n${body}` : "";
      })
      .filter(Boolean);
    return [introText, ...subTexts].filter(Boolean).join("\n\n");
  };

  for (const section of sections) {
    const key = `p${seq++}`;
    const heading = section.heading;
    const fullText = sectionBody(section);
    parents.push({ key, heading, text: `## ${heading}\n\n${fullText}` });

    // Children: each subsection (split further if very large), plus the section
    // intro. Subsections are only "owned" by this parent — `###` does not create
    // its own parent per the agreed markdown format.
    if (section.intro.some((l) => l.trim().length > 0)) {
      addParentChildren(
        parents[parents.length - 1]!,
        heading,
        section.intro.join("\n")
      );
    }
    for (const sub of section.subsections) {
      const body = sub.body.join("\n").trim();
      if (!body) continue;
      const text = `### ${sub.heading}\n\n${body}`;
      if (estimateTokens(text) <= CHILD_CHUNK_MAX_TOKENS) {
        children.push({
          parentKey: key,
          heading: sub.heading,
          part: 0,
          text,
        });
      } else {
        splitTextIntoChunks(body).forEach((partText, part) => {
          children.push({
            parentKey: key,
            heading: sub.heading,
            part,
            text: `### ${sub.heading}\n\n${partText}`,
          });
        });
      }
    }
  }

  // Content before the first `##` becomes its own parent ("Introduction").
  const introText = intro.join("\n").trim();
  if (introText.length > 0) {
    const key = `p${seq++}`;
    const heading = title || "Introduction";
    parents.push({ key, heading, text: introText });
    addParentChildren(parents[parents.length - 1]!, heading, introText);
  }

  if (parents.length === 0) {
    throw ApiError.badRequest("Markdown file produced no chunkable sections.");
  }

  return { parents, children };
};