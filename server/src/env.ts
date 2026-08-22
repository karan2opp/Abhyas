import { z } from "zod";
import "dotenv/config";
const envSchema = z.object({
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GENERATION_MODEL: z.string().default("mistral-small-latest"),
  EVALUATION_MODEL: z.string().default("mistral-small-latest"),
  GUARDRAIL_MODEL: z.string().default("mistral-small-latest"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}
export const env = createEnv(process.env);
