import dotenv from "dotenv";

dotenv.config();

// Deletes the RAG collections (exams + knowledge_*) so they are recreated with
// the new named-vector (dense + sparse BM25) schema on the next indexing run.
// Question-bank collections (question_examples*) are intentionally left intact.
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

  const targets = names.filter((n) => n === "exams" || n.startsWith("knowledge_"));
  if (targets.length === 0) {
    console.log("No RAG collections (exams / knowledge_*) found to reset.");
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

  console.log("\nDone. RAG collections will be recreated with the new schema on the next index.");
};

run().catch((e) => {
  console.error("Fatal reset error:", e);
  process.exit(1);
});