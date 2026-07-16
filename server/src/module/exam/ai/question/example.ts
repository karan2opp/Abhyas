import { BASE_FALLBACK_EXAMPLE } from "./fallbackExample.js";

/**
 * Represents a prompt example used for few-shot prompting.
 */
export interface PromptExample {
    examTitle: string;
    subject: string;
    questions: unknown[];
}

/**
 * Metadata returned with every prompt example.
 */
export interface PromptExampleResult {
    example: PromptExample;
    source: "organization" | "shared" | "fallback";
}

/**
 * Service responsible for providing prompt examples.
 *
 * NOTE:
 * Right now we only use the fallback example.
 *
 * Later this can be connected to Prisma or MongoDB
 * without changing the agents.
 */
class PromptExampleService {
    async getExample(
        orgId: string,
        examType: string,
        subject: string
    ): Promise<PromptExampleResult> {
        // ------------------------------------------------------------------
        // Future implementation:
        //
        // 1. Look for organization-specific examples
        // 2. Look for shared subject examples
        // 3. Fall back to default example
        // ------------------------------------------------------------------

        return {
            example: BASE_FALLBACK_EXAMPLE,
            source: "fallback",
        };
    }
}

const promptExampleService = new PromptExampleService();

/**
 * Public helper used by all Question Agents.
 */
export async function getPromptExample(
    orgId: string,
    examType: string,
    subject: string
): Promise<PromptExampleResult> {
    return promptExampleService.getExample(
        orgId,
        examType,
        subject
    );
}

/**
 * Simple logger.
 * Helps identify which example source was used.
 */
export function logPromptSource(
    subject: string,
    source: PromptExampleResult["source"]
) {
    console.info(
        `[Question Agent] Subject="${subject}" ExampleSource="${source}"`
    );
}