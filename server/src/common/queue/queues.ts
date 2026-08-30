import { Queue, QueueEvents } from "bullmq";
import { env } from "../../env.js";

const connection = { url: env.REDIS_URL };

export const generationQueue = new Queue<{ blueprint: any; organisationId?: string | null }>("generation", { connection });
export const evaluationQueue = new Queue<{ submissionId: string; mode: string }>("evaluation", { connection });
export const ragIndexQueue = new Queue<{
  filePath: string;
  originalFileName: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  organisationId?: string | null;
}>("rag-index", { connection });
export const ragIndexEvents = new QueueEvents("rag-index", { connection });

export type RagRetrievalJob =
  | {
      mode: "standard";
      subject: string;
      topic: string;
      subtopic: string;
      topK: number;
      organisationId: string | null | undefined;
      query: string | undefined;
    }
  | {
      mode: "advanced";
      question: string;
      topK: number;
      organisationId: string | null | undefined;
    };

export const ragRetrievalQueue = new Queue<RagRetrievalJob>("rag-retrieval", { connection });
export const ragRetrievalEvents = new QueueEvents("rag-retrieval", { connection });