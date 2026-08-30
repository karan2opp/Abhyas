import api from "@/utils/axios";
import { useAuthStore } from "@/store/authStore";

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

export interface ChatChunkItem {
  text: string;
  childText: string;
  score: number;
  sourceFile: string;
  heading: string;
  parentHeading: string;
  page?: number;
}

export interface ChatResponse {
  answer: string;
  chunks: ChatChunkItem[];
  usedRag: boolean;
}

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
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

export const chatRetrieveService = async (
  question: string,
  topK: number = 5,
  history: ChatHistoryEntry[] = []
): Promise<ChatResponse> => {
  const res = await api.post("/rag/chat/retrieve", { question, topK, history });
  return res.data.data || { answer: "", chunks: [], usedRag: true };
};

export interface ChatStreamHandlers {
  onRouted?: (routed: { useRag: boolean; reason: string }) => void;
  onStatus?: (status: { stage: string }) => void;
  onChunks?: (payload: { chunks: ChatChunkItem[]; usedRag: boolean }) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

/**
 * Streams the chatbot response over SSE (POST /rag/chat/stream). The server
 * emits `routed`, `status`, `chunks`, `answer` (token deltas), `error` and
 * `done` events. Resolves once the stream completes.
 */
export const streamChatRetrieveService = async (
  question: string,
  topK: number = 5,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
  history: ChatHistoryEntry[] = []
): Promise<void> => {
  const token = useAuthStore.getState().accessToken;
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const res = await fetch(`${baseURL}/rag/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ question, topK, history }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Stream request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (raw: string) => {
    const lines = raw.split("\n");
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data = line.slice(5).trim();
    }
    if (!data) return;

    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    switch (event) {
      case "routed":
        handlers.onRouted?.(parsed);
        break;
      case "status":
        handlers.onStatus?.(parsed);
        break;
      case "chunks":
        handlers.onChunks?.(parsed);
        break;
      case "answer":
        handlers.onToken?.(parsed.text ?? "");
        break;
      case "error":
        handlers.onError?.(parsed.message ?? "Stream error");
        break;
      case "done":
        handlers.onDone?.();
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (chunk.trim()) dispatch(chunk);
    }
  }
  if (buffer.trim()) dispatch(buffer);
};
