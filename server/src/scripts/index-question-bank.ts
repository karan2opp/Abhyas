import path from "path";
import dotenv from "dotenv";
import { indexCuratedQuestionBank } from "../module/generation/questionBank/questionBank.service.js";

dotenv.config();

const DEFAULT_DIR = path.join(
  process.cwd(),
  "src",
  "module",
  "generation",
  "questionBank"
);

const run = async () => {
  const dir = process.env.QUESTION_BANK_DIR || DEFAULT_DIR;
  console.log(`Scanning question bank directory: ${dir}`);

  const result = await indexCuratedQuestionBank(dir);

  console.log("\n=== Summary ===");
  console.log(`Indexed: ${result.indexed}`);
  console.log(`Skipped (already indexed): ${result.skipped}`);
  console.log(`Errors: ${result.errors}`);
};

run().catch((err) => {
  console.error("Fatal indexing error:", err);
  process.exit(1);
});
