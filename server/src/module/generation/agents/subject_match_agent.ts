import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { SubjectMatchAgentOutputZodSchema } from "../Types/outputSubjectMatch.js";

function getSystemPrompt(): string {
  return `You are a subject-matching agent for an exam-generation platform.

You are given:
- "user_subject": the subject name a teacher typed for their exam.
- "available_subjects": the subject names that actually exist in the organisation's
  knowledge base.

Your job is to decide whether the user's subject is related to any available subject
well enough that searching that knowledge base subject would help generate questions.

RULES:
1. A match is valid when the available subject is the same field, a synonym, a broader
   topic that contains the user's subject, or a narrower topic within the user's subject.
   For example, "Fundamentals of Computer" is related to "Computer Networking"; "JavaScript"
   is related to "Programming Languages".
2. Pick AT MOST ONE available subject: the single most related one.
3. Return "matchedSubject": null when NO available subject is meaningfully related
   (for example, user subject "Cooking" vs available subjects ["JavaScript", "Tally"]).
4. Do not be overly aggressive. A weak or coincidental keyword overlap (for example
   "Computer Security" vs "Computer Architecture") is not a match.
5. Respond with STRICT JSON only — no explanation, no markdown, no text outside the JSON
   object. Use exactly this structure:

{
  "matchedSubject": "string or null",
  "reason": "short explanation"
}
`;
}

export async function subjectMatchAgent(
    userSubject: string,
    availableSubjects: string[]
): Promise<{ matchedSubject: string | null; reason: string }> {
    const client = await getClientForModel(env.GUARDRAIL_MODEL);
    const response = await client.chat.completions.create({
        model: env.GUARDRAIL_MODEL,
        messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify({ user_subject: userSubject, available_subjects: availableSubjects }) }
        ],
        response_format: zodResponseFormat(
            SubjectMatchAgentOutputZodSchema,
            "subject_match_agent_output"
        )
    });
    const content = response.choices[0]?.message.content || "{}";
    const parsed = SubjectMatchAgentOutputZodSchema.parse(JSON.parse(content));
    return { matchedSubject: parsed.matchedSubject, reason: parsed.reason };
}