import dotenv from "dotenv";

dotenv.config();

// Creates keyword payload indexes on all existing Qdrant collections so that
// filtered retrieval (metadata.subject/topic/subtopic/type/...) stops failing
// with "Index required but not found". Non-destructive — indexes apply to the
// points already stored, so no re-upload is required.
const INDEX_FIELDS = [
  "metadata.subject",
  "metadata.topic",
  "metadata.topicKey",
  "metadata.subtopic",
  "metadata.subtopicKey",
  "metadata.type",
  "metadata.fileHash",
  "metadata.sourceFile",
  "metadata.questionId",
];

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
  if (names.length === 0) {
    console.log("No collections found.");
    return;
  }

  let created = 0;
  let errors = 0;

  for (const name of names) {
    for (const field of INDEX_FIELDS) {
      const res = await fetch(`${qdrantUrl}/collections/${name}/index`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ field_name: field, field_schema: "keyword" }),
      });
      if (res.ok || res.status === 400) {
        if (res.ok) created++;
      } else {
        console.warn(`Failed index "${field}" on "${name}": ${res.status} ${await res.text()}`);
        errors++;
      }
    }
  }

  console.log(`Done. Created ${created} index(es) across ${names.length} collection(s); ${errors} error(s).`);
};

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});