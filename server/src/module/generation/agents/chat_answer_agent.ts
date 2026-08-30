import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";

export interface ChatContextEntry {
  source: string;
  page: number | undefined;
  text: string;
}

const MAX_CONTEXT_ENTRIES = 4;
const MAX_ENTRY_CHARS = 1800;

function getSystemPrompt(): string {
  return `You are a helpful study chatbot for an exam platform.

You are given:
- "question": the user's question.
- "context": passages retrieved from the organisation's knowledge base. Each entry has "source" (file name), "page" (page number, 0/undefined if not applicable) and "text".
- "memories": optional long-term facts mem0 remembered about this user (preferences, level, prior topics).

RULES:
1. Answer the question based on the provided context. If the context contains the answer, use it and cite the source, e.g. (source, p.3).
2. If "context" is empty or does not contain the answer, answer from your own general knowledge but clearly state that this topic was not found in the knowledge base.
3. Use "memories" only when relevant and helpful — e.g. personalizing the tone, referencing the user's stated preference or level. Never contradict the context because of a memory.
4. Do NOT invent citations or facts not present in the context.
5. Answer in clear markdown. Keep it concise but complete.
6. Respond with plain text only — no JSON, no code fences around the answer.
`;
}

const buildUserMessage = (
  question: string,
  context: ChatContextEntry[],
  memories: string[]
) => {
  const trimmed = context
    .slice(0, MAX_CONTEXT_ENTRIES)
    .map((c) => {
      const page = c.page && c.page > 0 ? `p.${c.page}` : "no page";
      return `---\nSource: ${c.source} (${page})\n${c.text.slice(0, MAX_ENTRY_CHARS)}`;
    })
    .join("\n\n");

  return JSON.stringify({
    question,
    context: context.length > 0 ? trimmed : [],
    memories: memories.slice(0, 6),
  });
};

/**
 * Streams a grounded answer to `question` using the retrieved `context`.
 * Calls `onToken` with each text delta as it arrives and resolves with the full
 * answer once the stream finishes.
 */
export async function streamChatAnswer(
  question: string,
  context: ChatContextEntry[],
  onToken: (delta: string) => void,
  memories: string[] = []
): Promise<string> {
  const client = await getClientForModel(env.GENERATION_MODEL);
  const stream = await client.chat.completions.create({
    model: env.GENERATION_MODEL,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: buildUserMessage(question, context, memories) },
    ],
    stream: true,
  });

  let full = "";
  for await (const part of stream) {
    const delta = part.choices?.[0]?.delta?.content;
    if (delta) {
      onToken(delta);
      full += delta;
    }
  }
  return full;
}

/** Non-streaming variant: collects the streamed tokens and returns the full answer. */
export async function generateChatAnswer(
  question: string,
  context: ChatContextEntry[],
  memories: string[] = []
): Promise<string> {
  return streamChatAnswer(question, context, () => {}, memories);
}