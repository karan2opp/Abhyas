"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  QuestionReviewRealtimeToolResult,
  sendQuestionReviewTurn,
  getQuestionReviewHistory,
} from "@/services/generationAgents.service";
import { useRealtimeVoiceAgent } from "@/hooks/useRealtimeVoiceAgent";
import { useEntitlements } from "@/hooks/useEntitlements";

interface QuestionReviewChatProps {
  examId: string;
  // Receives the exam's fresh section/block/question tree after every
  // mutation — same shape getSectionsWithDetailsService returns, so the
  // caller can apply it directly to its own `sections` state.
  onSectionsChange: (sections: any[]) => void;
  onDone?: () => void;
}

// The teacher works through edits to the REAL, already-saved exam (add,
// remove, reword, change MCQ options, or ask for 1-3 new AI-written questions
// on a subtopic). Every change takes effect immediately.
//
// Spoken when the plan includes the voice agent, typed otherwise — the same
// agent and the same tools either way.
export default function QuestionReviewChat({ examId, onSectionsChange, onDone }: QuestionReviewChatProps) {
  const { entitlements } = useEntitlements();
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [reply, setReply] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // The agent remembers this exam's conversation server-side, so restore the
  // transcript on mount — otherwise a refresh shows an empty panel while the
  // agent still has the context behind it.
  useEffect(() => {
    if (entitlements.voiceAgent) return;
    let active = true;
    getQuestionReviewHistory(examId)
      .then((result) => {
        if (active && result.history.length > 0) setHistory(result.history);
      })
      .catch(() => {
        // Non-fatal: the teacher can still carry on, just without the
        // earlier turns shown.
      });
    return () => {
      active = false;
    };
  }, [examId, entitlements.voiceAgent]);

  const sendMessage = async () => {
    const outgoing = reply.trim();
    if (!outgoing || isThinking) return;

    setHistory((prev) => [...prev, { role: "user", content: outgoing }]);
    setReply("");
    setIsThinking(true);
    try {
      const result = await sendQuestionReviewTurn(examId, outgoing);
      setHistory((prev) => [...prev, { role: "assistant", content: result.message }]);
      // The server re-reads the exam after applying edits, so this is always
      // the post-change state.
      if (result.sections) onSectionsChange(result.sections);
      if (result.done) {
        toast.success(result.message || "Question review marked complete.");
        onDone?.();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not send that message");
    } finally {
      setIsThinking(false);
    }
  };

  const voice = useRealtimeVoiceAgent({
    agent: "question_review",
    onToolResult: (name, result: QuestionReviewRealtimeToolResult) => {
      if (result?.sections) onSectionsChange(result.sections);
      if (result?.done) {
        toast.success(result.message || "Question review marked complete.");
        onDone?.();
      }
    },
  });

  const toggleVoice = async () => {
    if (voice.status === "connected" || voice.status === "connecting") {
      voice.stop();
      return;
    }
    try {
      await voice.start({ examId });
    } catch {
      toast.error(voice.error || "Could not start the question review conversation");
    }
  };

  const isVoiceActive = voice.status === "connected" || voice.status === "connecting";

  return (
    <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col h-full max-h-[640px]">
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <h4 className="text-sm font-bold text-white">Question Review Agent</h4>
        </div>
        {/* Voice is a paid plan feature; the text chat below covers the same
            review flow for plans without it. */}
        {entitlements.voiceAgent && (
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
        )}
      </div>
      <p className="text-[11px] text-gray-500 mb-3 -mt-1">
        Ask to add, remove, or reword a question, change an MCQ&apos;s options, or generate 1-3 new questions for a
        subtopic — {entitlements.voiceAgent ? "say" : "type"} &quot;that&apos;s all&quot; when you&apos;re done.
      </p>

      {!entitlements.voiceAgent ? (
        <>
          <div className="flex-1 min-h-[200px] overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            {history.length === 0 && (
              <p className="text-xs text-gray-500 italic text-center py-6">
                Type a change you&apos;d like to make to this exam.
              </p>
            )}
            {history.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    turn.role === "user"
                      ? "bg-orange-600 text-white"
                      : "bg-zinc-900 border border-white/10 text-gray-200"
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            ))}
            {isThinking && <p className="text-xs text-gray-500 italic">Working on it...</p>}
          </div>

          <div className="flex items-center gap-2 pt-3">
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isThinking) void sendMessage();
              }}
              disabled={isThinking}
              placeholder="e.g. reword question 3 to be clearer"
              className="bg-[#09090b] border-white/15 text-white placeholder:text-zinc-500 h-9 text-xs"
            />
            <Button
              onClick={() => void sendMessage()}
              disabled={isThinking || !reply.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-3 text-xs font-semibold"
            >
              Send
            </Button>
          </div>
        </>
      ) : (
      <div className="flex-1 min-h-[200px] overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
        {voice.transcript.length === 0 && !isVoiceActive && (
          <p className="text-xs text-gray-500 italic text-center py-6">Click &quot;Talk&quot; to start reviewing by voice.</p>
        )}
        {voice.transcript.length === 0 && isVoiceActive && <p className="text-xs text-gray-500 italic">Listening...</p>}
        {voice.transcript.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                turn.role === "user" ? "bg-orange-600 text-white" : "bg-zinc-900 border border-white/10 text-gray-200"
              }`}
            >
              {turn.text}
            </div>
          </div>
        ))}
        {voice.partial && (
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
      </div>
      )}
    </div>
  );
}
