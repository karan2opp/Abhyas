import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { ApiError } from "../../../common/utils/ApiError.js";

const GUARDRAIL_SYSTEM_PROMPT = `You are a safety guardrail agent for an exam question-generation platform.

Your job is to inspect a generation request and decide whether it is a
legitimate request to practice/generate study or exam questions (or a
blueprint/plan that leads to them) on an academic or professional topic, or
whether it must be rejected.

The request will typically be phrased like "Generate exam questions / an exam
blueprint / an assignment / a question paper for subject X with topics Y and Z
and N questions". The topic list may include software applications and their
features (e.g. "MS Excel Data Tab", "MS Word Home Tab", "Tally", "JavaScript
Functions", "Computer Networking") — these are legitimate exam subjects.

Mark "isValid": false if the request:
1. Is not about generating practice/exam questions (or a blueprint/plan for them)
   on an academic or professional subject.
2. Asks for opinions, commentary, or analysis on real people, political parties,
   or current events — even if framed as "questions about" them.
3. Asks for a different output type than exam questions or an exam-question plan
   (essays, summaries, source code, private information, stories, direct answers
   to homework).
4. Contains harmful, hateful, or unsafe content.

Mark "isValid": true if the request:
1. Asks to generate exam questions, an exam blueprint, a question paper, a mock
   test, a quiz, an assignment, or any plan/outline that leads to practice or
   exam questions, for any academic or professional subject.
2. Mentions an academic or professional subject (school/college/board/competitive
   subjects, programming, computer science, software applications like
   MS Word/MS Excel/Tally, technical certifications, commerce/accounting, etc.)
   together with topics and a request for questions.
3. Is about Politics, Religion, or Current Events when requested as educational
   exam-style questions (e.g., Political Science, Constitutional Law, World
   Religions, History, Social Studies).
4. Requests quizzes, MCQs, true/false, or descriptive question formats.
5. Is safe and does not contain harmful content.

When in doubt, treat requests about clearly academic or professional topics that
mention questions or a question plan as VALID. Only reject clear violations.

Respond with STRICT JSON only, in this exact shape:
{ "isValid": true, "reason": "short explanation" }`;

/**
 * Runs the scope/safety guardrail on a generation request (topics, instructions).
 * Fails closed: only an explicit { isValid: true } passes. Rejects unsafe or
 * off-topic requests with 400, and aborts with 500 if the guardrail itself errors.
 */
export const assertSafeGenerationRequest = async (text: string): Promise<void> => {
    let parsed: { isValid?: boolean; reason?: string };

    try {
        const client = await getClientForModel(env.GUARDRAIL_MODEL);
        const response = await client.chat.completions.create({
            model: env.GUARDRAIL_MODEL,
            messages: [
                { role: "system", content: GUARDRAIL_SYSTEM_PROMPT },
                { role: "user", content: text },
            ],
            response_format: { type: "json_object" },
        });

        const resultStr = response.choices[0]?.message?.content || "{}";
        parsed = JSON.parse(resultStr);
    } catch (err) {
        console.error("Guardrail execution failed:", err);
        throw ApiError.internal("Safety check failed");
    }

    if (parsed?.isValid !== true) {
        throw ApiError.badRequest(parsed?.reason || "Invalid request according to safety guardrails.");
    }
};
