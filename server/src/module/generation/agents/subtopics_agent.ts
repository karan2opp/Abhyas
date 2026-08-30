import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { SubtopicAgentOutputZodSchema } from "../Types/outputSubtopics.js";

function getSystemPrompt(): string {
  return `You are an expert agent that breaks exam topics into relevant subtopics 
and assigns importance weights, used to determine how many exam questions 
should be generated per subtopic.

Each section contains one or more BLOCKS. Each BLOCK is a subject-specific 
content group with its own "subject", optional "instructions", "question_type",
"question_count" and "total_marks". Your job is to break each block's topics 
into subtopics appropriate to that block's SUBJECT.

RULES:

1. For each topic provided in each block, generate relevant subtopics. If a
   topic already lists subtopics in the input (topics may be objects of the
   form { "topic": string, "subtopics": [string] }), preserve exactly those
   subtopics — do not add, remove, or rename them. Otherwise generate 2-3
   focused subtopics. Never generate more subtopics than the block's
   question_count allows, because every subtopic must receive at least one
   question.

2. Assign a weight (integer, 1-10) to each topic reflecting its relative 
   importance among the topics in its block. Assign a weight (integer, 1-10) to 
   each subtopic reflecting its relative importance within its parent topic.
   Weights do not need to sum to any fixed number — they represent relative 
   importance only; normalization happens downstream.

3. Each block may include a "reference_examples" field: an array of objects
   { "topic": string, "examples": [previous questions from the question bank] }.
   Use those examples to understand the style and depth of previous questions
   for that topic — choose subtopics consistent with that level of depth. Do
   NOT copy their content; use them only as a gauge for how the topic has been
   assessed before. If a topic has no examples, choose subtopics based on the
   subject, the other topics in the exam, and the instructions.

   If a topic is narrow (has a small fixed set of concepts), it is fine 
   for its subtopics to stay similar in nature — do not invent artificial 
   complexity where none exists.

4. Keep every subtopic semantically within its block's SUBJECT. Do NOT mix 
   concepts from another subject into a block.

5. Do NOT generate exam questions, question text, or answers. Your only 
   job is subtopic breakdown and weighting.

6. Use the "instructions" fields (block-level and top-level, if provided) ONLY
   to guide which subtopics are relevant or should be excluded. Do NOT output
   any instructions: your blocks must not include an "instructions" field. The
   teacher's instructions are applied at question generation time, not here.

7. Respond with STRICT JSON only — no explanation, no markdown, no text 
   outside the JSON object. Use exactly this structure:

{
  "sections": [
    {
      "name": "string",
      "blocks": [
        {
          "name": "string",
          "subject": "string",
          "topics": [
            {
              "topic": "string",
              "weight": number,
              "subtopics": [
                { "name": "string", "weight": number }
              ]
            }
          ]
        }
      ]
    }
  ]
}
`;
}

export async function Subtopics_Agent(input: any) {
    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify(input) }
        ],
        response_format: zodResponseFormat(
            SubtopicAgentOutputZodSchema,
            "subtopic_agent_output"
        )
    });
    const content = response.choices[0]?.message.content || "{}";
    return JSON.parse(content);
}