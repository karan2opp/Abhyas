import { chunk } from "./chunk.js";
import { checkOpenAI } from "../../common/agent/openai.client.js";
import { ApiError } from "../../common/utils/ApiError.js";

export interface TextAnswer {
    answerId: string;
    questionId: string;
    question: string;
    modelAnswer: string;
    studentAnswer: string;
    maxMarks: number;
    questionImages?: { url: string; publicId: string }[] | null;
}

export type EvaluationMode = "detailed" | "simple";

const BATCH_SIZE = 10;

const buildEvaluationPrompt = (answers: TextAnswer[], mode: EvaluationMode) => {
    const contentParts: any[] = [];
    let textPrompt = `Evaluate the following student answers.\n\n`;

    answers.forEach((a, i) => {
        textPrompt += `Question ${i + 1}: ${a.question}\n`;
        textPrompt += `Model/Expected Answer: ${a.modelAnswer}\n`;
        textPrompt += `Student Answer: ${a.studentAnswer}\n`;
        textPrompt += `Max Marks: ${a.maxMarks}\n\n`;
        
        if (a.questionImages && a.questionImages.length > 0) {
            contentParts.push({ type: "text", text: textPrompt });
            textPrompt = `Image for Question ${i + 1} provided above.\n\n`;
            a.questionImages.forEach(img => {
                contentParts.push({
                    type: "image_url",
                    image_url: { url: img.url }
                });
            });
        }
    });

    textPrompt += mode === "detailed"
        ? `For each question, provide: score out of max marks, and a brief feedback explaining the score.`
        : `For each question, provide: score out of max marks only.`;
        
    contentParts.push({ type: "text", text: textPrompt });

    return contentParts;
}
const SYSTEM_PROMPT = `You are an expert exam evaluator for a computer training institute.

Evaluation rules:
- Compare student answer against the model answer for accuracy and completeness
- Give partial marks for partially correct answers (don't be strictly binary)
- Be fair but consistent in grading
- For code answers, check logic correctness, not just exact syntax match
- Return results in the EXACT same order as questions were provided. Include an "index" field (0-based) matching the input order.

Respond ONLY in valid JSON:
{
  "results": [
    {
      "index": number,
      "questionId": "string",
      "score": number,
      "maxScore": number,
      "feedback": "string or null"
    }
  ]
}`
export const evaluateTextAnswersBatched = async (
    answers: TextAnswer[],
    mode: EvaluationMode
) => {
    // if under batch size, just run directly — no need to split
    if (answers.length <= BATCH_SIZE) {
        return evaluateTextAnswers(answers, mode);
    }

    const batches = chunk(answers, BATCH_SIZE);

    // run all batches in parallel for speed
    const batchResults = await Promise.all(
        batches.map(batch => evaluateTextAnswers(batch, mode))
    );

    return batchResults.flat();
};

export const evaluateTextAnswers = async (answers: TextAnswer[], mode: EvaluationMode) => {
    const client = await checkOpenAI();
    const userPrompt = buildEvaluationPrompt(answers, mode);

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0]?.message?.content || "{}");

        return result.results.map((r: any, i: number) => {
            const answer = answers[i];
            if (!answer) {
                console.warn(`Extraneous result from GPT at index ${i}`);
                return null;
            }
            if (r.index !== i) {
                console.warn(`Order mismatch at index ${i}, expected ${r.index}`);
            }
            return {
                ...r,
                answerId: answer.answerId,
                questionId: answer.questionId
            };
        }).filter(Boolean);
    } catch (error) {
        throw new ApiError(500, "Failed to evaluate answers");
    }
};