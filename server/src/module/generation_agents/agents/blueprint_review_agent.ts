import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodFunction } from "openai/helpers/zod";
import { z } from "zod";
import {
    SetSubtopicCountArgsZodSchema,
    SetTopicCountArgsZodSchema,
    AddSubtopicArgsZodSchema,
    DeleteSubtopicArgsZodSchema,
    AddTopicArgsZodSchema,
    DeleteTopicArgsZodSchema,
    IncreaseTotalQuestionCountArgsZodSchema,
} from "../Types/outputBlueprintReview.js";
import {
    applySetSubtopicCount,
    applySetTopicCount,
    applyAddSubtopic,
    applyDeleteSubtopic,
    applyAddTopic,
    applyDeleteTopic,
    applyIncreaseTotalQuestionCount,
    type AddTopicGenerationContext,
} from "../blueprint_edit_ops.js";
import type { ExamBlueprintSection } from "../Types/outputSubtopics.js";
import type { ConversationTurn } from "../Types/outputConversation.js";
import { getBlueprintReviewSystemPrompt } from "../../../prompts/blueprint_review_agent.prompt.js";

export const tools = [
    zodFunction({ name: "set_subtopic_count", parameters: SetSubtopicCountArgsZodSchema, description: "Set one subtopic's question count." }),
    zodFunction({ name: "set_topic_count", parameters: SetTopicCountArgsZodSchema, description: "Set one topic's total question count." }),
    zodFunction({ name: "add_subtopic", parameters: AddSubtopicArgsZodSchema, description: "Add a new subtopic under an existing topic." }),
    zodFunction({ name: "delete_subtopic", parameters: DeleteSubtopicArgsZodSchema, description: "Delete a subtopic." }),
    zodFunction({ name: "add_topic", parameters: AddTopicArgsZodSchema, description: "Add a new topic to the section." }),
    zodFunction({ name: "delete_topic", parameters: DeleteTopicArgsZodSchema, description: "Delete a topic and all its subtopics." }),
    zodFunction({
        name: "increase_total_question_count",
        parameters: IncreaseTotalQuestionCountArgsZodSchema,
        description: "Change the section's total question count. Only use this when the teacher explicitly asks to grow or shrink the exam itself.",
    }),
    zodFunction({
        name: "finish_review",
        parameters: z.object({ summary_message: z.string().describe("A short confirmation message to show the teacher") }),
        description: "Call only when the teacher explicitly confirms there are no more changes to make.",
    }),
];

function replaceSection(sections: ExamBlueprintSection[], updated: ExamBlueprintSection): ExamBlueprintSection[] {
    return sections.map((s) => (s.name === updated.name ? updated : s));
}

export async function executeTool(
    sections: ExamBlueprintSection[],
    name: string,
    argsRaw: string,
    generationContextBySection: Record<string, AddTopicGenerationContext>
): Promise<{ sections: ExamBlueprintSection[]; resultText: string; changeLog: string[] }> {
    try {
        const args = JSON.parse(argsRaw || "{}");
        const sectionName: string | undefined = args.section;
        const section = sectionName ? sections.find((s) => s.name === sectionName) : undefined;
        if (!section) {
            return { sections, resultText: `Error: section "${sectionName || ""}" not found in this exam.`, changeLog: [] };
        }

        switch (name) {
            case "set_subtopic_count": {
                const r = applySetSubtopicCount(section, SetSubtopicCountArgsZodSchema.parse(args));
                return { sections: replaceSection(sections, r.section), resultText: r.changeLog.join(" "), changeLog: r.changeLog };
            }
            case "set_topic_count": {
                const r = applySetTopicCount(section, SetTopicCountArgsZodSchema.parse(args));
                return { sections: replaceSection(sections, r.section), resultText: r.changeLog.join(" "), changeLog: r.changeLog };
            }
            case "add_subtopic": {
                const r = applyAddSubtopic(section, AddSubtopicArgsZodSchema.parse(args));
                return { sections: replaceSection(sections, r.section), resultText: r.changeLog.join(" "), changeLog: r.changeLog };
            }
            case "delete_subtopic": {
                const r = applyDeleteSubtopic(section, DeleteSubtopicArgsZodSchema.parse(args));
                return { sections: replaceSection(sections, r.section), resultText: r.changeLog.join(" "), changeLog: r.changeLog };
            }
            case "add_topic": {
                const generationContext = generationContextBySection[section.name];
                if (!generationContext) {
                    return { sections, resultText: `Error: missing generation context for section "${section.name}".`, changeLog: [] };
                }
                const r = await applyAddTopic(section, AddTopicArgsZodSchema.parse(args), generationContext);
                return { sections: replaceSection(sections, r.section), resultText: r.changeLog.join(" "), changeLog: r.changeLog };
            }
            case "delete_topic": {
                const r = applyDeleteTopic(section, DeleteTopicArgsZodSchema.parse(args));
                return { sections: replaceSection(sections, r.section), resultText: r.changeLog.join(" "), changeLog: r.changeLog };
            }
            case "increase_total_question_count": {
                const r = applyIncreaseTotalQuestionCount(section, IncreaseTotalQuestionCountArgsZodSchema.parse(args));
                return { sections: replaceSection(sections, r.section), resultText: r.changeLog.join(" "), changeLog: r.changeLog };
            }
            default:
                return { sections, resultText: `Unknown tool "${name}".`, changeLog: [] };
        }
    } catch (err: any) {
        return { sections, resultText: `Error: ${err?.message || "the change could not be applied"}`, changeLog: [] };
    }
}

export interface BlueprintReviewResult {
    message: string;
    sections: ExamBlueprintSection[];
    done: boolean;
    changeLog: string[];
}

const MAX_TOOL_ROUNDS = 5;

export async function blueprintReviewAgentTurn(
    sections: ExamBlueprintSection[],
    generationContextBySection: Record<string, AddTopicGenerationContext>,
    history: ConversationTurn[],
    userMessage: string
): Promise<BlueprintReviewResult> {
    const client = await getClientForModel(env.GENERATION_MODEL);

    let currentSections = sections;
    const allChangeLog: string[] = [];
    let done = false;

    const messages: any[] = [
        { role: "system", content: getBlueprintReviewSystemPrompt() },
        { role: "user", content: `Current exam blueprint (all sections):\n${JSON.stringify(currentSections)}` },
        ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user", content: userMessage },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await client.chat.completions.create({
            model: env.GENERATION_MODEL,
            messages,
            tools,
            tool_choice: "auto",
        });

        const choice = response.choices[0]?.message;
        const toolCalls = choice?.tool_calls || [];

        if (toolCalls.length === 0) {
            return {
                message: choice?.content || "",
                sections: currentSections,
                done,
                changeLog: allChangeLog,
            };
        }

        messages.push({ role: "assistant", content: choice?.content ?? null, tool_calls: toolCalls });

        for (const call of toolCalls) {
            if (call.type !== "function") continue;

            if (call.function.name === "finish_review") {
                done = true;
                let summaryMessage = "Got it — the plan is finalized.";
                try {
                    summaryMessage = JSON.parse(call.function.arguments || "{}").summary_message || summaryMessage;
                } catch {
                    // keep default
                }
                messages.push({ role: "tool", tool_call_id: call.id, content: "Review marked complete." });
                // Whatever question counts the tools have produced up to this point are
                // returned as-is — the source of truth for the next pipeline stage. No
                // rebalancing or validation runs on finish.
                return { message: summaryMessage, sections: currentSections, done: true, changeLog: allChangeLog };
            }

            const result = await executeTool(currentSections, call.function.name, call.function.arguments, generationContextBySection);
            currentSections = result.sections;
            allChangeLog.push(...result.changeLog);
            messages.push({ role: "tool", tool_call_id: call.id, content: result.resultText || "Done." });
        }

        // Keep the model's view of the blueprint current for its next reasoning step.
        messages.push({ role: "user", content: `Updated exam blueprint (all sections):\n${JSON.stringify(currentSections)}` });
    }

    return {
        message: "I've applied several changes — let me know if you'd like anything else adjusted.",
        sections: currentSections,
        done,
        changeLog: allChangeLog,
    };
}
