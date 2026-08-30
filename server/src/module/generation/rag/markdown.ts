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