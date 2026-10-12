import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { ExamIntentAgentOutputZodSchema, type ConversationTurn, type ConversationSummary, type ExamIntentAgentOutput } from "../Types/outputConversation.js";
import type { IInputExam } from "../Types/inputExam.js";
import { searchMemories, addMemories } from "../../../common/utils/mem0.js";
import { getExamIntentSystemPrompt } from "../../../prompts/exam_intent_agent.prompt.js";

const topicName = (t: IInputExam["sections"][number]["topics"][number]): string =>
  typeof t === "string" ? t : t.topic;

// Fixed strings the "Skip Question" / "Skip All Questions" chat buttons send
// as the user's turn, instead of freeform text — the system prompt below
// teaches the model exactly what each one means, so behavior is deterministic
// rather than depending on how a real teacher might happen to phrase "skip".
// Exported so the controller sends the exact same text the prompt describes.
export const SKIP_QUESTION_SIGNAL = "[[SKIP_QUESTION]] The user has no preference for the question you just asked — do not ask it again.";
export const SKIP_ALL_SIGNAL = "[[SKIP_ALL]] The user wants to stop answering and move on — finalize now using only what has already been discussed.";
export const FORCE_CONCLUDE_SIGNAL = "[[FORCE_CONCLUDE]] You must set done to true and produce the summary in this reply — this is mandatory.";

// Builds a short query describing this exam so mem0 can surface only the
// memories relevant to it (not everything this teacher has ever said).
function buildMemoryQuery(examInput: IInputExam): string {
  const subjects = [...new Set(examInput.sections.map((s) => s.subject))].join(", ");
  const topics = [...new Set(examInput.sections.flatMap((s) => s.topics.map(topicName)))].join(", ");
  const parts = [`Exam preferences for subject(s): ${subjects}`, `topics: ${topics}`];
  if (examInput.educationLevel) parts.push(`education level: ${examInput.educationLevel.value}`);
  if (examInput.difficulty) parts.push(`difficulty: ${examInput.difficulty}`);
  return parts.join(", ");
}

// Flattens the final summary into synthetic "user" turns so mem0's own
// extraction can pull long-term facts out of it, same as it would from a
// real chat transcript.
function summaryToMemoryMessages(summary: ConversationSummary): { role: "user"; content: string }[] {
  const lines = [
    ...summary.globalInstructions.map((i) => `Exam preference (general): ${i}`),
    ...summary.topicSpecificInstructions.flatMap((t) =>
      t.instructions.map((i) => `Exam preference for topic "${t.topic}": ${i}`)
    ),
  ];
  return lines.map((content) => ({ role: "user" as const, content }));
}

// Teaches mem0 what was learned once a summary is final — shared by the text
// turn flow below and the realtime voice flow (Realtime.ts), which produces
// the same ConversationSummary via a tool call instead of response_format.
export function persistIntentMemories(summary: ConversationSummary, examTitle: string | undefined, userId: string): void {
  void addMemories(summaryToMemoryMessages(summary), userId, {
    source: "exam-intent-agent",
    examTitle,
  });
}

export async function examIntentAgentTurn(
  examInput: IInputExam,
  history: ConversationTurn[],
  userId?: string | null
) {
  const client = await getClientForModel(env.GENERATION_MODEL);

  // Pull in only the memories relevant to this exam (not this teacher's
  // entire history) — no-op (empty array) if mem0 isn't configured.
  const memories = userId ? await searchMemories(buildMemoryQuery(examInput), userId, 5) : [];

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: getExamIntentSystemPrompt() },
    { role: "user", content: `Exam skeleton:\n${JSON.stringify(examInput)}` },
    ...(memories.length > 0
      ? [{
        role: "user" as const,
        content: `FALLBACK ONLY — do not mention, reference, or let these shape any question. Use one of these only if the user explicitly gives no preference for that exact aspect (e.g. "I don't know" / "no preference" / "you decide"), to fill that one gap in the summary:\n${memories.map((m) => `- ${m}`).join("\n")}`,
      }]
      : []),
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
  ];

  // Retried like every other structured-output call in this codebase
  // (evaluateSingleAnswer, generateTopicQuestions): the model occasionally
  // returns a malformed/empty object for a turn, and without a retry that
  // was an unhandled ZodError reaching the teacher as a raw, unreadable
  // message instead of the conversation just continuing.
  const MAX_ATTEMPTS = 3;
  let result: ExamIntentAgentOutput | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages,
        response_format: zodResponseFormat(
          ExamIntentAgentOutputZodSchema,
          "exam_intent_agent_output"
        ),
      });

      const content = response.choices[0]?.message.content || "{}";
      result = ExamIntentAgentOutputZodSchema.parse(JSON.parse(content));
      break;
    } catch (err) {
      lastError = err;
      console.warn(
        `[exam-intent-agent] attempt ${attempt + 1}/${MAX_ATTEMPTS} produced an invalid response, ${attempt + 1 < MAX_ATTEMPTS ? "retrying" : "giving up"}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (!result) {
    throw new Error(
      `The exam intent agent could not produce a valid response after ${MAX_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }

  // Hard guarantee, independent of prompt adherence: never let the very
  // first turn conclude with zero questions asked. Memory can make the model
  // over-confident that everything is already known — difficulty, topic
  // emphasis, and question style vary per exam and must be confirmed, not
  // silently inherited from a past exam.
  if (history.length === 0 && result.done) {
    result = {
      done: false,
      message: "Before finalizing the plan, what type of questions would you like for this exam — and is there a difficulty level or topic emphasis you'd like to go with?",
      summary: null,
    };
  }

  // Fire-and-forget: once the conversation concludes, teach mem0 what was
  // learned so future exams from this teacher need fewer questions.
  if (result.done && result.summary && userId) {
    persistIntentMemories(result.summary, examInput.title, userId);
  }

  return result;
}
