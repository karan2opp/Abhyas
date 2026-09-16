import type { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getClientForModel } from "../../common/agent/openai.client.js";
import { env } from "../../env.js";

const MAX_ATTEMPTS = 3;

/** One structured-output call, retried when the model returns something that doesn't parse. */
export async function callStructured<T extends z.ZodTypeAny>(
    schema: T,
    name: string,
    system: string,
    user: string
): Promise<z.infer<T>> {
    const client = await getClientForModel(env.GENERATION_MODEL);
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await client.chat.completions.create({
                model: env.GENERATION_MODEL,
                temperature: 0.2,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                response_format: zodResponseFormat(schema, name),
            });
            const content = response.choices[0]?.message.content;
            if (!content) throw new Error("empty response");
            return schema.parse(JSON.parse(content));
        } catch (err) {
            lastError = err;
            console.warn(`[books] ${name} attempt ${attempt} failed: ${(err as Error)?.message}`);
        }
    }
    throw new Error(`${name} failed after ${MAX_ATTEMPTS} attempts: ${(lastError as Error)?.message}`);
}

export interface Range {
    start: number;
    end: number;
}

/**
 * Makes ranges cover [first, last] exactly once, in order: sorted, clamped, gaps closed by extending the
 * earlier range, overlaps trimmed from the later one. Ranges that end up empty are dropped.
 */
export function repairRanges<T extends Range>(ranges: T[], first: number, last: number): T[] {
    const sorted = ranges
        .map((r) => ({ ...r, start: Math.max(first, r.start), end: Math.min(last, r.end) }))
        .filter((r) => r.end >= r.start)
        .sort((a, b) => a.start - b.start || a.end - b.end);

    const out: T[] = [];
    for (const range of sorted) {
        const prev = out[out.length - 1];
        if (!prev) {
            out.push({ ...range, start: first });
            continue;
        }
        if (range.start > prev.end + 1) prev.end = range.start - 1;
        if (range.start <= prev.end) range.start = prev.end + 1;
        if (range.start > range.end) continue;
        out.push(range);
    }
    if (out.length > 0) out[out.length - 1]!.end = last;
    return out;
}
