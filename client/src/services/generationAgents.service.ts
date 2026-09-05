import api from "@/utils/axios";

export type QuestionType = "mcq" | "descriptive";
export type Difficulty = "easy" | "medium" | "hard";

export type EducationCategory =
  | "Lower Middle School"
  | "Middle School"
  | "High School"
  | "Senior Secondary"
  | "Undergraduate"
  | "Postgraduate"
  | "Professional"
  | "Not Specified";

export interface EducationLevel {
  value: string;
  category: EducationCategory;
}

export type TopicInput =
  | string
  | { topic: string; subtopics?: string[]; instructions?: string[] };

export interface SectionInput {
  name: string;
  subject: string;
  question_count: number;
  question_type: QuestionType;
  marks: number;
  topics: TopicInput[];
}

export interface ExamInput {
  title?: string;
  instructions?: string[];
  difficulty?: Difficulty;
  educationLevel?: EducationLevel;
  sections: SectionInput[];
}

export interface ConversationTurn {
  role: "assistant" | "user";
  content: string;
}

export interface TopicSpecificInstruction {
  topic: string;
  instructions: string[];
}

export interface ConversationSummary {
  globalInstructions: string[];
  topicSpecificInstructions: TopicSpecificInstruction[];
}

export interface ConversationAgentOutput {
  sessionId: string;
  done: boolean;
  message: string;
  summary: ConversationSummary | null;
}

// Starts a new Exam Intent Agent conversation, persisted server-side. Returns
// the sessionId to pass to continueExamIntentConversation for every reply.
export const startExamIntentConversation = async (
  examInput: ExamInput
): Promise<ConversationAgentOutput> => {
  const res = await api.post("/generation-agents/conversation", { examInput });
  return res.data.data;
};

// Continues an existing conversation — the server reconstructs history from
// its own stored messages, so only the sessionId and the new reply go over
// the wire.
export const continueExamIntentConversation = async (
  sessionId: string,
  message: string
): Promise<ConversationAgentOutput> => {
  const res = await api.post("/generation-agents/conversation", { sessionId, message });
  return res.data.data;
};

export interface AllocatedSubtopic {
  name: string;
  weight: number;
  allocatedQuestions: number;
}

export interface AllocatedTopic {
  topic: string;
  weight: number;
  allocatedQuestions: number;
  subtopics: AllocatedSubtopic[];
}

export interface ExamBlueprintSection {
  name: string;
  subject: string;
  topics: AllocatedTopic[];
}

export interface ExamBlueprint {
  sections: ExamBlueprintSection[];
}

export type BlueprintStatus = "pending" | "in_progress" | "completed" | "failed";

export interface BlueprintStatusResponse {
  sessionId: string;
  blueprintStatus: BlueprintStatus;
  blueprint: ExamBlueprint | null;
  blueprintError: string | null;
}

// Fires the subtopics pipeline (Inngest, one batch per section) for a
// completed intent session. Returns immediately — poll getBlueprintStatus
// for the result.
export const triggerBlueprintGeneration = async (
  sessionId: string
): Promise<{ sessionId: string; blueprintStatus: BlueprintStatus }> => {
  const res = await api.post("/generation-agents/blueprint/generate", { sessionId });
  return res.data.data;
};

export const getBlueprintStatus = async (sessionId: string): Promise<BlueprintStatusResponse> => {
  const res = await api.get(`/generation-agents/blueprint/${sessionId}`);
  return res.data.data;
};

// Creates and immediately completes an Exam Intent session with no chat —
// for callers (like a one-shot config form) that already have their own
// instructions UI and have nothing left for the agent to ask about. From
// here on the session behaves exactly like a chat-completed one.
export const quickStartSession = async (
  examInput: ExamInput,
  globalInstructions: string[] = []
): Promise<{ sessionId: string }> => {
  const res = await api.post("/generation-agents/session/quick-start", { examInput, globalInstructions });
  return res.data.data;
};

// ── Blueprint Review Agent (chat-based refinement, alongside direct tree editing) ──

export interface BlueprintReviewTurnResult {
  sessionId: string;
  message: string;
  sections: ExamBlueprintSection[];
  done: boolean;
  changeLog: string[];
}

// `sections` should be the caller's current (possibly hand-edited) tree —
// it becomes the state the agent operates on and is persisted server-side
// either way, so direct tree edits and chat edits never diverge.
export const sendBlueprintReviewTurn = async (
  sessionId: string,
  message: string,
  sections: ExamBlueprintSection[]
): Promise<BlueprintReviewTurnResult> => {
  const res = await api.post("/generation-agents/review/turn", { sessionId, message, sections });
  return res.data.data;
};

export const getBlueprintReviewHistory = async (
  sessionId: string
): Promise<{ sessionId: string; history: ConversationTurn[]; blueprint: ExamBlueprint | null }> => {
  const res = await api.get(`/generation-agents/review/${sessionId}`);
  return res.data.data;
};

// ── Question generation ──

export interface RubricCategory {
  name: string;
  weight: number;
  key_points: string[];
}

export interface Rubric {
  categories: RubricCategory[];
}

export interface MCQGeneratedQuestion {
  id: string;
  type: "mcq";
  topic: string;
  subtopic: string;
  question_text: string;
  options: string[];
  correct_option: "A" | "B" | "C" | "D";
  marks: number;
}

export interface DescriptiveGeneratedQuestion {
  id: string;
  type: "descriptive";
  topic: string;
  subtopic: string;
  question_text: string;
  rubric: Rubric;
  marks: number;
}

export type GeneratedQuestion = MCQGeneratedQuestion | DescriptiveGeneratedQuestion;

export interface GeneratedTopicQuestions {
  topic: string;
  questions: GeneratedQuestion[];
}

export interface GeneratedSectionQuestions {
  name: string;
  subject: string;
  topics: GeneratedTopicQuestions[];
}

export interface GeneratedExam {
  sections: GeneratedSectionQuestions[];
}

export type QuestionsStatus = "pending" | "in_progress" | "completed" | "failed";

export interface QuestionsStatusResponse {
  sessionId: string;
  questionsStatus: QuestionsStatus;
  questions: GeneratedExam | null;
  questionsError: string | null;
}

// Fires the question-generation pipeline (Inngest, one call per topic, run
// section by section) for a session whose blueprint is already completed.
// Returns immediately — poll getQuestionsStatus for results as sections land.
// `sections`, if given, syncs one last set of edits (e.g. from a direct tree
// editor) into the session's blueprint right before generation starts.
export const triggerQuestionGeneration = async (
  sessionId: string,
  sections?: ExamBlueprintSection[]
): Promise<{ sessionId: string; questionsStatus: QuestionsStatus }> => {
  const res = await api.post("/generation-agents/questions/generate", { sessionId, sections });
  return res.data.data;
};

export const getQuestionsStatus = async (sessionId: string): Promise<QuestionsStatusResponse> => {
  const res = await api.get(`/generation-agents/questions/${sessionId}`);
  return res.data.data;
};

export const triggerTestPipelineService = async (
  payload: Record<string, unknown>
): Promise<{ eventIds: string[] }> => {
  const res = await api.post("/generation-agents/pipeline/test", payload);
  return res.data.data;
};

// ── Realtime voice agents ──

export type RealtimeAgentKind = "intent" | "review" | "question_review";

export interface RealtimeSessionResponse {
  sessionId: string;
  clientSecret: string;
  model: string;
}

// Mints a short-lived OpenAI Realtime session for one agent. For "intent"
// with no sessionId, also creates the underlying session (same as starting
// a text conversation). For "review", sessionId must point to a session
// whose blueprint is already completed. For "question_review", examId must
// point to a real, already-saved exam — it operates directly on that exam's
// live questions, not a generation session.
export const startRealtimeSession = async (
  agent: RealtimeAgentKind,
  opts: { sessionId?: string; examInput?: ExamInput; examId?: string } = {}
): Promise<RealtimeSessionResponse> => {
  const res = await api.post("/generation-agents/realtime/session", { agent, ...opts });
  return res.data.data;
};

export const executeIntentRealtimeTool = async (
  sessionId: string,
  name: string,
  argsRaw: string
): Promise<{ output: any; summary?: ConversationSummary }> => {
  const res = await api.post("/generation-agents/realtime/intent/tool", { sessionId, name, argsRaw });
  return res.data.data;
};

export interface ReviewRealtimeToolResult {
  done: boolean;
  output: any;
  sections: ExamBlueprintSection[];
  changeLog?: string[];
  message?: string;
}

export const executeReviewRealtimeTool = async (
  sessionId: string,
  name: string,
  argsRaw: string
): Promise<ReviewRealtimeToolResult> => {
  const res = await api.post("/generation-agents/realtime/review/tool", { sessionId, name, argsRaw });
  return res.data.data;
};

export interface QuestionReviewRealtimeToolResult {
  done: boolean;
  output: any;
  // The real exam's fresh section/block/question tree (same shape
  // getSectionsWithDetailsService returns) — apply directly to the
  // builder's `sections` state, no separate refetch needed.
  sections?: any[];
  changeLog?: string[];
  message?: string;
}

export const executeQuestionReviewRealtimeTool = async (
  sessionId: string,
  name: string,
  argsRaw: string
): Promise<QuestionReviewRealtimeToolResult> => {
  const res = await api.post("/generation-agents/realtime/question-review/tool", { sessionId, name, argsRaw });
  return res.data.data;
};

export const logIntentRealtimeTurn = async (sessionId: string, role: "user" | "assistant", content: string): Promise<void> => {
  await api.post("/generation-agents/realtime/intent/log", { sessionId, role, content });
};

export const logReviewRealtimeTurn = async (sessionId: string, role: "user" | "assistant", content: string): Promise<void> => {
  await api.post("/generation-agents/realtime/review/log", { sessionId, role, content });
};
