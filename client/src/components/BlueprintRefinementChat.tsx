"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendBlueprintReviewTurn,
  getBlueprintReviewHistory,
  ConversationTurn,
  ExamBlueprintSection,
  ReviewRealtimeToolResult,
} from "@/services/generationAgents.service";
import { useRealtimeVoiceAgent } from "@/hooks/useRealtimeVoiceAgent";

interface BlueprintRefinementChatProps {
  sessionId: string;
  sections: ExamBlueprintSection[];
  onSectionsChange: (sections: ExamBlueprintSection[]) => void;
}

// A chat-based alternative to editing the blueprint tree by hand — sends the
// caller's CURRENT sections on every turn (whatever the tree editor last
// produced) so the agent always reasons over the latest state regardless of
// which editing surface touched it last. Supports both typed and spoken
// (OpenAI Realtime, WebRTC) turns against the exact same backend tools.
export default function BlueprintRefinementChat({ sessionId, sections, onSectionsChange }: BlueprintRefinementChatProps) {
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [reply, setReply] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const loadedSessionRef = useRef<string | null>(null);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const voice = useRealtimeVoiceAgent({
    agent: "review",
    onToolResult: (name, result: ReviewRealtimeToolResult) => {
      if (result?.sections) onSectionsChange(result.sections);
      if (result?.done) toast.success(result.message || "Refinement agent marked the review complete.");
    },
  });

  useEffect(() => {
    if (loadedSessionRef.current === sessionId) return;
    loadedSessionRef.current = sessionId;
    getBlueprintReviewHistory(sessionId)
      .then((res) => setHistory(res.history))
      .catch(() => {
        // No prior turns yet — fine to start with an empty thread.
      });
  }, [sessionId]);

  const sendMessage = async () => {
    const outgoing = reply.trim();
    if (!outgoing || isThinking) return;

    setHistory((prev) => [...prev, { role: "user", content: outgoing }]);
    setReply("");
    setIsThinking(true);
    try {
      const result = await sendBlueprintReviewTurn(sessionId, outgoing, sectionsRef.current);
      setHistory((prev) => [...prev, { role: "assistant", content: result.message }]);
      onSectionsChange(result.sections);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Refinement agent turn failed");
      setHistory((prev) => prev.slice(0, -1));
      setReply(outgoing);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleVoice = async () => {
    if (voice.status === "connected" || voice.status === "connecting") {
      voice.stop();
      return;
    }
    try {
      await voice.start({ sessionId });
    } catch {
      toast.error(voice.error || "Could not start the voice conversation");
    }
  };

  const isVoiceActive = voice.status === "connected" || voice.status === "connecting";
  const displayedTurns: { role: "user" | "assistant"; text: string }[] =
    isVoiceActive || voice.transcript.length > 0
      ? voice.transcript
      : history.map((turn) => ({ role: turn.role, text: turn.content }));

  return (
    <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col h-full max-h-[640px]">
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <h4 className="text-sm font-bold text-white">Refinement Agent</h4>
        </div>
        <Button
          onClick={toggleVoice}
          size="sm"
          variant="outline"
          className={`h-7 px-2.5 text-[11px] font-semibold rounded-lg ${
            isVoiceActive
              ? "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
              : "bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20"
          }`}
        >
          {isVoiceActive ? (
            <>
              <MicOff className="h-3 w-3 mr-1" /> {voice.status === "connecting" ? "Connecting..." : "End Call"}
            </>
          ) : (
            <>
              <Mic className="h-3 w-3 mr-1" /> Talk
            </>
          )}
        </Button>
      </div>
      <p className="text-[11px] text-gray-500 mb-3 -mt-1">
        Ask for changes in plain language — e.g. &quot;give Arrays 3 more questions&quot; — by typing or talking.
      </p>

      <div className="flex-1 min-h-[200px] overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
        {displayedTurns.length === 0 && !isThinking && (
          <p className="text-xs text-gray-500 italic text-center py-6">
            {isVoiceActive ? "Listening..." : "No messages yet — ask for a change."}
          </p>
        )}
        {displayedTurns.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs [&_ul]:list-disc [&_ul]:list-inside [&_p:not(:last-child)]:mb-1.5 ${
                turn.role === "user" ? "bg-orange-600 text-white" : "bg-zinc-900 border border-white/10 text-gray-200"
              }`}
            >
              <ReactMarkdown>{turn.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isVoiceActive && voice.partial && (
          <div className={`flex ${voice.partial.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs italic opacity-70 ${
                voice.partial.role === "user" ? "bg-orange-600 text-white" : "bg-zinc-900 border border-white/10 text-gray-200"
              }`}
            >
              {voice.partial.text}
            </div>
          </div>
        )}
        {isThinking && <p className="text-xs text-gray-500 italic">Thinking...</p>}
      </div>

      {!isVoiceActive && (
        <div className="flex gap-2 pt-3 mt-3 border-t border-white/5">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isThinking && sendMessage()}
            placeholder="e.g. Add a subtopic to Arrays..."
            className="bg-[#14151f] border-white/10 text-gray-200 text-xs h-9"
            disabled={isThinking}
          />
          <Button
            onClick={sendMessage}
            disabled={isThinking || !reply.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 h-9 w-9 p-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
