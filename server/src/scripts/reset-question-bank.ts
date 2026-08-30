import dotenv from "dotenv";

dotenv.config();

// Deletes the question-bank collections (question_examples + question_examples_*)
// so every curated question is removed. The collections are recreated with the
// hybrid (dense + sparse BM25) schema on the next ingest/retrieve.
const run = async () => {
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.QDRANT_API_KEY) {
    headers["api-key"] = process.env.QDRANT_API_KEY;
  }

  const listRes = await fetch(`${qdrantUrl}/collections`, { headers });
  if (!listRes.ok) {
    console.error(`Failed to list collections: ${listRes.status} ${await listRes.text()}`);
    process.exit(1);
  }

  const data: any = await listRes.json();
  const names: string[] = (data.result?.collections ?? []).map((c: any) => c.name);

  const targets = names.filter((n) => n.startsWith("question_examples"));
  if (targets.length === 0) {
    console.log("No question-bank collections (question_examples*) found to reset.");
    return;
  }

  for (const name of targets) {
    const del = await fetch(`${qdrantUrl}/collections/${name}`, { method: "DELETE", headers });
    console.log(
      del.ok
        ? `Deleted ${name}`
        : `Failed to delete ${name}: ${del.status} ${await del.text()}`
    );
  }

  console.log("\nDone. Question bank collections will be recreated on the next ingest.");
};

run().catch((e) => {
  console.error("Fatal reset error:", e);
  process.exit(1);
});