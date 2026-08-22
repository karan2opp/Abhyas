import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { indexDocument } from "../module/generation/rag/rag.service.js";

// Load environment variables (.env is in the server root folder)
dotenv.config();

// Helper to parse filename (e.g., "JavaScript_Variables.md" -> subject: "JavaScript", topic: "Variables")
const parseFilename = (filename: string): { subject: string; topic: string } => {
  const nameWithoutExt = filename.replace(/\.(md|markdown|pdf)$/i, "");
  const parts = nameWithoutExt.split("_");

  if (parts.length > 1) {
    const subject = parts[0]!.trim();
    const topic = parts.slice(1).join(" ").trim();
    return { subject, topic };
  }

  // Fallback if there is no underscore
  return {
    subject: "General",
    topic: nameWithoutExt.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  };
};

const runIndex = async () => {
  // Path to the generation/docs folder
  const docsDir = path.join(
    process.cwd(),
    "src",
    "module",
    "generation",
    "docs"
  );

  console.log(`📁 Scanning docs directory: ${docsDir}`);

  if (!fs.existsSync(docsDir)) {
    console.error("❌ Docs directory not found!");
    process.exit(1);
  }

  const files = fs.readdirSync(docsDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ext === ".md" || ext === ".markdown" || ext === ".pdf";
  });

  console.log(`🔍 Found ${files.length} supported files to index.`);

  let totalIndexed = 0;
  let skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    const filePath = path.join(docsDir, file);
    const { subject, topic } = parseFilename(file);

    console.log(
      `[${i + 1}/${files.length}] Indexing: "${file}"`
    );
    console.log(`   - Parsed Subject: "${subject}"`);
    console.log(`   - Parsed Topic  : "${topic}"`);

    try {
      const result = await indexDocument(filePath, file, subject, topic);
      if (result.chunksIndexed === 0) {
        console.log(`   ⚠️ Skipped (already indexed).`);
        skipped++;
      } else {
        console.log(`   ✅ Success: Indexed ${result.chunksIndexed} chunks.`);
        totalIndexed += result.chunksIndexed;
      }
    } catch (err) {
      console.error(`   ❌ Failed to index "${file}":`, err);
    }
  }

  console.log("\n========================================");
  console.log("🏁 Batch Indexing Completed!");
  console.log(`   - Total Files Processed: ${files.length}`);
  console.log(`   - Total Chunks Indexed: ${totalIndexed}`);
  console.log(`   - Skipped (Duplicates): ${skipped}`);
  console.log("========================================");
};

runIndex().catch((err) => {
  console.error("Fatal indexing error:", err);
  process.exit(1);
});
