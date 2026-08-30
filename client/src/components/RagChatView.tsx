"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Loader2, FileText, FileCode, BookOpen, ChevronDown, ChevronUp, SearchX, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamChatRetrieveService, type ChatChunkItem, type ChatHistoryEntry } from "@/services/knowledge.service";

type ChatMessage =
  | { id: number; role: "user"; content: string }
  | {
      id: number;
      role: "assistant";
      streaming: boolean;
      answer: string;
      chunks: ChatChunkItem[];
      usedRag: boolean;
      error?: string;
    };

const STAGE_LABELS: Record<string, string> = {
  searching: "Searching knowledge base...",
  answering: "Answering...",
};

// Robust markdown styling so code blocks/tables scroll inside the bubble
// instead of overflowing the chat thread horizontally.
const markdownComponents = {
  pre: ({ children }: any) => (
    <pre className="bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 my-2 overflow-x-auto custom-scrollbar text-xs font-mono text-gray-200 whitespace-pre">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }: any) => {
    const isInline = !(className?.includes("language-") || String(children ?? "").includes("\n"));
    return isInline ? (
      <code
        className="bg-orange-500/10 px-1.5 py-0.5 rounded text-orange-300 font-mono border border-orange-500/30 text-[0.9em] break-words"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className={"block font-mono text-xs text-gray-200 whitespace-pre-wrap break-words" + (className ? " " + className : "")} {...props}>
        {children}
      </code>
    );
  },
  p: ({ children }: any) => <p className="mb-2 last:mb-0 break-words">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
  h1: ({ children }: any) => <h1 className="text-base font-bold mt-3 mb-1 break-words">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold mt-3 mb-1 break-words">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold mt-2 mb-1 break-words">{children}</h3>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-orange-400 underline break-words">
      {children}
    </a>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2 border border-white/10 rounded-lg">
      <table className="border-collapse text-xs w-full min-w-max">{children}</table>
    </div>
  ),
};

const isPdf = (name: string) => name.toLowerCase().endsWith(".pdf");

function SourceIcon({ source }: { source: string }) {
  return isPdf(source) ? (
    <FileText className="h-4 w-4 text-orange-400" />
  ) : (
    <FileCode className="h-4 w-4 text-sky-400" />
  );
}

function ChunkCard({
  chunk,
  index,
  expanded,
  onToggle,
}: {
  chunk: ChatChunkItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasPage = typeof chunk.page === "number" && chunk.page > 0;
  const scorePct = Math.round(chunk.score * 10);

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl max-w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <span className="w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-xs shrink-0">
          #{index + 1}
        </span>

        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-mono min-w-0">
          <SourceIcon source={chunk.sourceFile} />
          <strong className="text-gray-200 break-words min-w-0">{chunk.sourceFile || "Document"}</strong>
        </span>

        {hasPage ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
            <BookOpen className="h-3 w-3" />
            Page {chunk.page}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold font-mono">
            Markdown
          </span>
        )}

        {chunk.heading && <span className="text-xs text-gray-300 font-medium">· {chunk.heading}</span>}

        <span className="ml-auto bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold px-2.5 py-1 rounded-full">
          Relevance: {scorePct}%
        </span>
      </div>

      <div className="bg-black/60 border border-white/5 rounded-xl p-3.5 text-xs font-mono text-gray-200 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
        {chunk.childText || chunk.text}
      </div>

      {chunk.text && chunk.text !== chunk.childText && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 transition-all"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-orange-400" />
            Parent Section Context
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {expanded && chunk.text && chunk.text !== chunk.childText && (
        <div className="bg-black/60 border border-white/5 rounded-xl p-3.5 text-xs font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed max-h-72 overflow-y-auto custom-scrollbar">
          {chunk.text}
        </div>
      )}
    </div>
  );
}

export default function RagChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const toggleExpanded = (key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    setInput("");
    setIsLoading(true);

    // Recent completed turns, sent to the server so mem0 can extract long-term
    // memories from the conversation (and for potential future multi-turn use).
    const history: ChatHistoryEntry[] = messagesRef.current
      .slice(-10)
      .filter((m) => !(m.role === "assistant" && m.streaming))
      .map((m): ChatHistoryEntry =>
        m.role === "user"
          ? { role: "user", content: m.content }
          : { role: "assistant", content: m.answer }
      )
      .filter((m) => m.content.trim().length > 0);

    const userMsg: ChatMessage = { id: idRef.current++, role: "user", content: question };
    const assistantId = idRef.current++;
    const loadingMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      streaming: true,
      answer: "",
      chunks: [],
      usedRag: true,
    };
    setMessages((m) => [...m, userMsg, loadingMsg]);

    const abort = new AbortController();
    abortRef.current = abort;

    type AssistantMsg = Extract<ChatMessage, { role: "assistant" }>;
    const patchAssistant = (patch: Partial<AssistantMsg>) => {
      setMessages((m) =>
        m.map((msg) => (msg.id === assistantId && msg.role === "assistant" ? { ...msg, ...patch } : msg))
      );
    };

    try {
      await streamChatRetrieveService(
        question,
        5,
        {
          onChunks: ({ chunks, usedRag }) => patchAssistant({ chunks, usedRag }),
          onToken: (token) =>
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId && msg.role === "assistant"
                  ? { ...msg, answer: msg.answer + token }
                  : msg
              )
            ),
          onDone: () => patchAssistant({ streaming: false }),
          onError: (message) => patchAssistant({ streaming: false, error: message }),
        },
        abort.signal,
        history
      );
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const message = err?.response?.data?.message || err?.message || "Failed to run RAG retrieval pipeline.";
      patchAssistant({ streaming: false, error: message });
      toast.error(message);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading]);

  return (
    <div className="space-y-6">
      <div className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center gap-4">
        <div className="bg-orange-600/20 text-orange-400 border border-orange-500/30 p-3 rounded-xl">
          <Bot className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            RAG Chatbot
            <Sparkles className="h-4 w-4 text-orange-400" />
          </h2>
          <p className="text-xs text-gray-400">
            Ask a natural-language question. Simple general facts are answered directly; subject questions run
            sub-questions · step-back · HyDE · hybrid search (dense + BM25) · RRF · parent expansion · re-ranking.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="bg-[#09090b] border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500 space-y-3">
            <Bot className="h-12 w-12 text-gray-700" />
            <div>
              <p className="text-sm font-medium text-white">Ask anything about the indexed knowledge base</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                e.g. "What is the difference between let and var in JavaScript?" — or a general fact like "When did
                World War 1 happen?"
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] bg-orange-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm shadow-lg shadow-orange-950/40 whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
            );
          }

          // assistant message
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[92%] w-full min-w-0 space-y-3">
                {msg.streaming && (
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {msg.answer ? "Answering..." : "Searching knowledge base..."}
                  </div>
                )}

                {msg.error ? (
                  <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-2xl rounded-bl-md text-sm text-red-400 break-words">
                    {msg.error}
                  </div>
                ) : (
                  <>
                    <div className="bg-[#14141a] border border-white/10 px-4 py-3.5 rounded-2xl rounded-bl-md text-sm text-gray-200 leading-relaxed shadow-lg min-w-0 max-w-full break-words">
                      {msg.answer ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.answer}
                        </ReactMarkdown>
                      ) : (
                        <span className="text-gray-400">{msg.streaming ? "Thinking..." : ""}</span>
                      )}
                      {msg.streaming && (
                        <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>

                    {!msg.streaming && !msg.usedRag && msg.answer && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-medium">
                        <Sparkles className="h-3 w-3" />
                        Answered from general knowledge — no knowledge-base context used
                      </div>
                    )}

                    {!msg.streaming && msg.chunks.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider pt-1">
                          <BookOpen className="h-3.5 w-3.5 text-orange-400" />
                          Sources ({msg.chunks.length})
                        </div>
                        {msg.chunks.map((chunk, idx) => (
                          <ChunkCard
                            key={`${msg.id}-${idx}`}
                            chunk={chunk}
                            index={idx}
                            expanded={expandedIds.has(`${msg.id}-${idx}`)}
                            onToggle={() => toggleExpanded(`${msg.id}-${idx}`)}
                          />
                        ))}
                      </>
                    )}

                    {!msg.streaming && msg.usedRag && msg.chunks.length === 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-500">
                        <SearchX className="h-4 w-4 text-gray-600" />
                        No relevant sources found in the knowledge base.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-xl bg-[#09090b] border border-white/15 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-orange-950/40 flex items-center gap-2 transition-all"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isLoading ? "Searching" : "Ask"}
        </button>
      </form>
    </div>
  );
}