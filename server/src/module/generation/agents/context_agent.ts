import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { ContextAgentOutputZodSchema, type ContextAgentOutput } from "../Types/outputContext.js";

function getSystemPrompt(): string {
  return `You are an expert subject-matter tutor.

Given a subject, topic, subtopic, and question type, you write a short,
accurate study note for the subtopic that can serve as the factual basis for exam
questions. This note is used as RAG context when the knowledge base has no indexed
material for the topic, and as the search query to find relevant knowledge.

RULES:
1. Keep the note scoped strictly to the given subtopic.
2. Cover the essential definitions, key concepts, and concrete facts/examples
   appropriate to the subtopic.
3. Do NOT invent facts. If you are not certain about a fact, keep the note
   generic but still useful for writing a question on the subtopic.
4. Do NOT write actual exam questions, answers, or options.
5. Respond with STRICT JSON only — no explanation, no markdown, no text outside
   the JSON object. Use exactly this structure:

{
  "context": "string",
  "key_concepts": ["string"],
  "sample_facts": ["string"]
}
`;
}

export async function Context_Agent(input: any) {
    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify(input) }
        ],
        response_format: zodResponseFormat(
            ContextAgentOutputZodSchema,
            "context_agent_output"
        )
    });
    const content = response.choices[0]?.message.content || "{}";
    return ContextAgentOutputZodSchema.parse(JSON.parse(content));
}

// Renders a generated context into a single, flat block of text suitable for a
// RAG context entry / search query.
export const contextToText = (c: ContextAgentOutput): string =>
    `${c.context}\n\nKey concepts: ${c.key_concepts.join(", ")}\n\nFacts: ${c.sample_facts.join("; ")}`;

// Tries to generate context for a unit; returns null on any failure so callers
// can gracefully fall back to the previous behaviour instead of failing the job.
export const tryGenerateContext = async (input: any): Promise<ContextAgentOutput | null> => {
    try {
        return await Context_Agent(input);
    } catch (err: any) {
        console.error(`Failed to generate context for "${input?.subtopic || input?.topic || ""}":`, err?.message || err);
        return null;
    }
};