import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { indexDocument } from "./rag.service.js";

dotenv.config();

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "src", "module", "generation", "rag", "output");

const extractTopic = (raw: string): string => {
  const match = raw.match(/^\s*#\s+(.+)$/m);
  return match ? match[1]!.trim() : "";
};

export async function indexMarkdownDirectory(
  dir: string = process.env.RAG_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
  subject: string = process.env.RAG_SUBJECT || ""
) {
  if (!subject.trim()) {
    throw new Error("Subject is required. Pass it as an argument or set RAG_SUBJECT.");
  }

  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  const files = fs.readdirSync(dir).filter((f) => /\.(md|markdown)$/i.test(f));
  console.log(`Found ${files.length} markdown files in ${dir} (subject: "${subject}")`);

  let indexed = 0;
  let duplicates = 0;
  let errors = 0;

  for (const fileName of files) {
    const filePath = path.join(dir, fileName);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const topic = extractTopic(raw);

      const result = await indexDocument(filePath, fileName, subject, topic);
      if (result.chunksIndexed === 0) {
        console.log(`- Already indexed: ${fileName}`);
        duplicates++;
      } else {
        console.log(`- Indexed ${result.chunksIndexed} chunks: ${fileName} (topic: "${topic}")`);
        indexed++;
      }
    } catch (error) {
      console.error(`- Failed to index ${fileName}:`, error);
      errors++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Indexed: ${indexed}`);
  console.log(`Duplicates: ${duplicates}`);
  console.log(`Errors: ${errors}`);
}

if (process.env.RUN_DIRECT_EMBEDDING === "true") {
  const args = process.argv.slice(2);
  const dirArg = args.find((a) => !a.startsWith("-"));
  const subjectArg = args.find((a, i) => args[i - 1] === "--subject" || args[i - 1] === "-s");

  indexMarkdownDirectory(dirArg, subjectArg || process.env.RAG_SUBJECT)
    .then(() => console.log("Done."))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
