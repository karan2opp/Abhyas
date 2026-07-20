import { z } from "zod";

export const GuardrailOutputSchema = z.object({
    isValid: z.boolean(),
    reason: z.string().optional(),
});

export type GuardrailOutput = z.infer<typeof GuardrailOutputSchema>;
