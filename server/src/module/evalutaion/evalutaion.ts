import { checkOpenAI } from "../../common/agent/openai.client.js";
import { ApiError } from "../../common/utils/ApiError.js";

export type EvaluationMode = "initial_evaluation" | "comparison_evaluation" | "tiebreaker_evaluation";
export type ResponseMode = "marks_only" | "marks_and_feedback";

export interface TextAnswer {
    answerId: string;
    questionId: string;
    question: string;
    modelAnswer?: string;
    studentAnswer: string;
    maxMarks: number;
    questionImages?: { url: string; publicId: string }[] | null;
}

export interface EvaluationOptions {
    evaluationMode: EvaluationMode;
    mode: ResponseMode;
    idealAnswer?: string | undefined;
    keyPoints?: string[] | undefined;
    round1Score?: number | undefined;
    round2Score?: number | undefined;
}

export interface EvaluationResult {
    questionId: string;
    idealAnswer?: string;
    keyPoints?: string[];
    pointsCovered?: string[];
    pointsMissed?: string[];
    marksAwarded: number;
    maxMarks: number;
    confidence?: "high" | "medium" | "low";
    reasoning?: string;
    feedback?: {
        strengths: string;
        improvements: string;
        suggestion: string;
    };
    answerId: string;
}

const SYSTEM_PROMPT = `## EVALUATION MODES

You will be called in three different modes based on the "evaluationMode" 
field in the input. Follow the exact instructions for each mode.

---

MODE 1 — "initial_evaluation"

Your job:
1. Read the question carefully
2. Silently generate an ideal answer in your mind
3. Identify 3-5 key points a perfect answer must cover
4. Evaluate the student answer against those key points
5. Award marks proportionally

Return this exact JSON:
{
  "questionId": "",
  "idealAnswer": "your generated ideal answer here",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "pointsCovered": ["point 1"],
  "pointsMissed": ["point 2", "point 3"],
  "marksAwarded": 0,
  "maxMarks": 0,
  "confidence": "high|medium|low",
  "feedback": {
    "strengths": "",
    "improvements": "",
    "suggestion": ""
  }
}

Set confidence based on how clear the question and answer are:
- high → question is clear, answer is clearly correct or incorrect
- medium → some ambiguity in question or answer
- low → very subjective question or very vague answer

---

MODE 2 — "comparison_evaluation"

You will receive:
- The original question
- The student answer
- An ideal answer generated in round 1
- Key points from round 1

Your job:
1. Compare student answer against the ideal answer point by point
2. Do NOT be influenced by round 1 score — evaluate independently
3. Check if student covered the same concepts even if worded differently
4. Award marks based on concept coverage not exact wording match

Return this exact JSON:
{
  "questionId": "",
  "pointsCovered": ["point 1"],
  "pointsMissed": ["point 2"],
  "marksAwarded": 0,
  "maxMarks": 0,
  "confidence": "high|medium|low",
  "feedback": {
    "strengths": "",
    "improvements": "",
    "suggestion": ""
  }
}

IMPORTANT:
- Never copy ideal answer text into feedback shown to student
- Credit student if they explained concept correctly in different words
- Do not penalize for different examples if concept is correct

---

MODE 3 — "tiebreaker_evaluation"

You will receive:
- The original question
- The student answer  
- The ideal answer
- Score from round 1
- Score from round 2

Your job:
1. Ignore both previous scores completely
2. Start fresh with zero bias
3. Evaluate independently as if seeing this for the first time
4. Your score is final and cannot be appealed

Return this exact JSON:
{
  "questionId": "",
  "marksAwarded": 0,
  "maxMarks": 0,
  "reasoning": "one sentence explaining your final decision",
  "feedback": {
    "strengths": "",
    "improvements": "",
    "suggestion": ""
  }
}

---

## CONFIDENCE BASED RETRY

After each evaluation set your confidence level:

high   → scores from round 1 and round 2 are trusted as is
medium → if round 1 and round 2 differ by more than 1 mark, 
         trigger tiebreaker
low    → always trigger tiebreaker regardless of score difference

---

## MARKING CONSISTENCY RULES

To ensure consistent scoring across all evaluations:

1. CONCEPT OVER WORDING
   Award marks if student explained concept correctly
   even if they used different words than the ideal answer
   
2. PARTIAL CREDIT SCALE
   Covered concept fully        → 100% of that point's marks
   Covered concept partially    → 50% of that point's marks
   Mentioned concept vaguely    → 25% of that point's marks
   Did not cover concept        → 0% of that point's marks

3. LENGTH BIAS — NEVER DO THIS
   Do not award higher marks just because answer is longer
   Do not penalize short answers if they cover all key points
   A 2 sentence perfect answer beats a 10 sentence vague answer

4. LANGUAGE TOLERANCE
   Do not penalize grammar or spelling mistakes
   Do not penalize informal language if content is correct
   Only penalize language if the subject being tested IS language

5. EXAMPLE TOLERANCE  
   Student does not need to give same example as ideal answer
   Any valid correct example gets full credit for that point
   
6. ROUNDING RULE
   Always round final marks to nearest 0.5
   Never award marks above maxMarks
   Never award negative marks

---

## FEW SHOT EXAMPLES FOR COMPARISON MODE

EXAMPLE 1 — Same concept different words (give full credit)
Question: "What is recursion in programming?"
Ideal answer: "Recursion is when a function calls itself to solve 
a smaller version of the same problem until it reaches a base case"
Student answer: "Recursion means a function keeps calling itself 
again and again until a stopping condition is met"
Result: Full credit — same concept, different wording ✅

EXAMPLE 2 — Partially correct (give partial credit)  
Question: "What is recursion in programming?"
Ideal answer: "Recursion is when a function calls itself to solve 
a smaller version of the same problem until it reaches a base case"
Student answer: "Recursion is when a function calls itself"
Result: 50% credit — got the core idea but missed base case ⚠️

EXAMPLE 3 — Different example same concept (give full credit)
Question: "Give an example of recursion"
Ideal answer: "Calculating factorial: factorial(n) = n * factorial(n-1)"
Student answer: "Fibonacci series where fib(n) = fib(n-1) + fib(n-2)"
Result: Full credit — different valid example ✅

EXAMPLE 4 — Length bias trap (do not give extra marks)
Question: "Define an API in 2 marks"
Student answer: "An API is an Application Programming Interface. 
It allows different software applications to communicate with each 
other. APIs are used everywhere in modern software development. 
They can be REST, SOAP, or GraphQL. Many companies provide public 
APIs for developers to use. APIs have endpoints, methods, and 
authentication. They return data in JSON or XML format. APIs are 
very important in web development and mobile apps."
Result: 2/2 — correct definition gets full marks, 
extra sentences don't add marks ⚠️

---

## INPUT FORMAT

Every evaluation call will include:

{
  "evaluationMode": "initial_evaluation|comparison_evaluation|tiebreaker_evaluation",
  "mode": "marks_only|marks_and_feedback",
  "questionId": "",
  "question": "",
  "studentAnswer": "",
  "maxMarks": 0,
  
  // only in comparison_evaluation and tiebreaker_evaluation
  "idealAnswer": "",
  "keyPoints": [],
  
  // only in tiebreaker_evaluation
  "round1Score": 0,
  "round2Score": 0
}

---

## RESTRICTIONS

NEVER:
- Show idealAnswer text directly to student in feedback
- Be influenced by previous round scores in tiebreaker mode
- Award marks above maxMarks
- Give 0 if student made any valid point
- Penalize grammar unless language is the subject
- Give higher marks just because answer is longer
- Skip the confidence field in your response
- Return anything other than valid JSON

ALWAYS:
- Evaluate independently in each round
- Credit correct concepts regardless of wording
- Round to nearest 0.5
- Set confidence honestly
- Return valid JSON every single time
- Keep feedback encouraging but honest`;

export const evaluateSingleAnswer = async (
    answer: TextAnswer,
    options: EvaluationOptions,
    retries = 1
): Promise<EvaluationResult> => {
    const client = await checkOpenAI();
    
    // Construct the JSON input object for the LLM
    const inputObj: any = {
        evaluationMode: options.evaluationMode,
        mode: options.mode,
        questionId: answer.questionId,
        question: answer.question,
        studentAnswer: answer.studentAnswer,
        maxMarks: answer.maxMarks
    };

    if (options.evaluationMode === "comparison_evaluation" || options.evaluationMode === "tiebreaker_evaluation") {
        inputObj.idealAnswer = options.idealAnswer || answer.modelAnswer; // fallback to teacher's model answer
        inputObj.keyPoints = options.keyPoints || [];
    }
    if (options.evaluationMode === "tiebreaker_evaluation") {
        inputObj.round1Score = options.round1Score;
        inputObj.round2Score = options.round2Score;
    }

    const contentParts: any[] = [];
    contentParts.push({ type: "text", text: JSON.stringify(inputObj, null, 2) });
    
    if (answer.questionImages && answer.questionImages.length > 0) {
        answer.questionImages.forEach(img => {
            contentParts.push({
                type: "image_url",
                image_url: { url: img.url }
            });
        });
    }

    let attempt = 0;
    while (true) {
        try {
            // Use gpt-4.1-mini for tiebreakers as it is more capable of resolving conflicts
            // Use gpt-4o-mini for initial and comparison rounds for speed and efficiency
            const modelToUse = options.evaluationMode === "tiebreaker_evaluation" ? "gpt-4.1-mini" : "gpt-4o-mini";

            const response = await client.chat.completions.create({
                model: modelToUse, 
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: contentParts }
                ],
                response_format: { type: "json_object" }
            });

            const resultStr = response.choices[0]?.message?.content || "{}";
            const result = JSON.parse(resultStr);

            return {
                ...result,
                answerId: answer.answerId,
                questionId: answer.questionId
            };
        } catch (error) {
            if (attempt >= retries) {
                console.error("Evaluation error:", error);
                throw new ApiError(500, "Failed to evaluate answer");
            }
            console.log("Retrying evaluation...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempt++;
        }
    }
};

const roundToHalf = (num: number) => Math.round(num * 2) / 2;

export const evaluateWithComparison = async (
    answer: TextAnswer, 
    mode: ResponseMode, 
    retries = 1
): Promise<EvaluationResult> => {
    let attempt = 0;
    while (true) {
        try {
            const r1 = await evaluateSingleAnswer(answer, {
                evaluationMode: "initial_evaluation",
                mode
            });

            const r2 = await evaluateSingleAnswer(answer, {
                evaluationMode: "comparison_evaluation",
                mode,
                idealAnswer: r1.idealAnswer,
                keyPoints: r1.keyPoints
            });

            const scoreDiff = Math.abs(r1.marksAwarded - r2.marksAwarded);
            
            let needsTiebreaker = false;
            if (r1.confidence === "low" || r2.confidence === "low" || scoreDiff > answer.maxMarks * 0.25) {
                needsTiebreaker = true;
            }

            if (needsTiebreaker) {
                const r3 = await evaluateSingleAnswer(answer, {
                    evaluationMode: "tiebreaker_evaluation",
                    mode,
                    idealAnswer: r1.idealAnswer,
                    keyPoints: r1.keyPoints,
                    round1Score: r1.marksAwarded,
                    round2Score: r2.marksAwarded
                });
                
                r3.marksAwarded = roundToHalf(r3.marksAwarded);
                return r3;
            }

            r2.marksAwarded = roundToHalf((r1.marksAwarded + r2.marksAwarded) / 2);
            return r2;
        } catch (error) {
            if (attempt >= retries) {
                throw error;
            }
            console.log("Retrying evaluation...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempt++;
        }
    }
};

export const evaluateTextAnswersBatched = async () => {
    throw new Error("Batched evaluation is deprecated in favor of single multi-round evaluation");
};