import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { BatchAssignmentAgentOutputSchema, SingleQuestionAssignmentOutputSchema } from "../Types/outputAssignment.js";
import type { BatchAssignmentAgentOutput } from "../Types/outputAssignment.js";

export const getAssignmentSystemPrompt = (): string => {
  return `You are an expert assignment question generation agent.

INPUTS YOU WILL RECEIVE:
- Subject, Topic (each with its own reference context and exact question count required)
- Difficulty: "easy", "medium", or "hard"
- Question Type: "mcq" or "descriptive"
- Special Instructions from the teacher
- RAG Context, labeled per Topic

RULES:
1. Generates questions based on the topic provided
2. Base every question strictly on the provided RAG context for that topic. Do not introduce facts or claims not supported by the context.
3. Follow special instructions if provided for better quality of question generation
4. Assign marks exactly as specified per question.
5. Always give structured output
6. Avoid generating duplicate questions
7. Cover questions for all the topics provided 
`;
};

async function assingmentAgent(input: any, isSingle = false): Promise<any> {
    const schema = isSingle ? SingleQuestionAssignmentOutputSchema : BatchAssignmentAgentOutputSchema;
    const responseName = isSingle ? "single_question_assignment_output" : "batch_assignment_agent_output";

    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            { 
                role: "system", 
                content: getAssignmentSystemPrompt() 
            },
            { 
                role: "user", 
                content: JSON.stringify(input) 
            }
        ],
        response_format: zodResponseFormat(
            schema,
            responseName
        )
    });

    const content = response.choices[0]?.message.content || "{}";
    const parsed = JSON.parse(content);
    return schema.parse(parsed);
}

export { assingmentAgent };