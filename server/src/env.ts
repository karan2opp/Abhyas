import { z } from "zod";
import "dotenv/config";
const envSchema = z.object({
  // 8000, not 3000 — 3000 is the Next dev server's port, so the old default
  // collided with the client whenever PORT wasn't set explicitly.
  PORT: z.string().default("8000").transform((val) => parseInt(val, 10)),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GENERATION_MODEL: z.string().default("mistral-small-latest"),
  EVALUATION_MODEL: z.string().default("mistral-small-latest"),
  GUARDRAIL_MODEL: z.string().default("mistral-small-latest"),
  REALTIME_MODEL: z.string().default("gpt-realtime"),
  REALTIME_VOICE: z.string().default("marin"),
  PDF_VISION_MODEL: z.string().default("gpt-4.1-mini"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}
export const env = createEnv(process.env);
