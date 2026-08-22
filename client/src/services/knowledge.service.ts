import api from "@/utils/axios";

export interface IndexResponse {
  success: boolean;
  message: string;
  data: {
    indexed: boolean;
    chunksIndexed?: number;
    fileHash: string;
    subject: string;
    topic: string;
  };
}

export interface CollectionItem {
  subject: string;
  topic: string;
  count: number;
}

export interface ChunkItem {
  text: string;
  score: number;
  sourceFile: string;
}

export const uploadKnowledgeDocumentService = async (
  file: File,
  subject: string,
  topic?: string,
  subtopic?: string
): Promise<IndexResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("subject", subject);
  if (topic) formData.append("topic", topic);
  if (subtopic) formData.append("subtopic", subtopic);

  const res = await api.post("/rag/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const getKnowledgeCollectionsService = async (): Promise<CollectionItem[]> => {
  const res = await api.get("/rag/collections");
  return res.data.data || [];
};

export const queryKnowledgeChunksService = async (
  subject: string,
  topic: string,
  subtopic: string = "",
  topK: number = 5
): Promise<ChunkItem[]> => {
  const res = await api.get("/rag/retrieve", {
    params: { subject, topic, subtopic, topK },
  });
  return res.data.data || [];
};
