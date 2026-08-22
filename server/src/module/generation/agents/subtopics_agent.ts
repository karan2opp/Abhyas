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

1. For each topic provided in each block, generate 3-5 relevant subtopics.

2. Assign a weight (integer, 1-10) to each topic reflecting its relative 
   importance among the topics in its block. Assign a weight (integer, 1-10) to 
   each subtopic reflecting its relative importance within its parent topic.
   Weights do not need to sum to any fixed number — they represent relative 
   importance only; normalization happens downstream.

3. The requested "difficulty" determines WHICH subtopics you choose, not 
   just their weights:
   - "easy": choose foundational, introductory subtopics only.
   - "medium": choose subtopics involving practical usage, common 
     patterns, and moderate complexity.
   - "hard": choose advanced, specialized, or problem-solving subtopics.
   
   If a topic is narrow (has a small fixed set of concepts), it is fine 
   for its subtopics to stay similar in nature — do not invent artificial 
   complexity where none exists.

4. Keep every subtopic semantically within its block's SUBJECT. Do NOT mix 
   concepts from another subject into a block.

5. Do NOT generate exam questions, question text, or answers. Your only 
   job is subtopic breakdown and weighting.

6. Use the "instructions" fields (block-level and top-level, if provided) to 
   guide which subtopics are relevant or should be excluded.

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
          "instructions": ["string"],
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
    const difficulty = input.difficulty || "medium";
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