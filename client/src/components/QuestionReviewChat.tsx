"use client";

import React from "react";
import { toast } from "sonner";
import { Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionReviewRealtimeToolResult } from "@/services/generationAgents.service";
import { useRealtimeVoiceAgent } from "@/hooks/useRealtimeVoiceAgent";

interface QuestionReviewChatProps {
  examId: string;
  // Receives the exam's fresh section/block/question tree after every
  // mutation — same shape getSectionsWithDetailsService returns, so the
  // caller can apply it directly to its own `sections` state.
  onSectionsChange: (sections: any[]) => void;
  onDone?: () => void;
}

// Voice-only — the teacher talks through edits to the REAL, already-saved
// exam (add, remove, reword, change MCQ options, or ask for 1-3 new
// AI-written questions on a subtopic). Every change takes effect immediately.
export default function QuestionReviewChat({ examId, onSectionsChange, onDone }: QuestionReviewChatProps) {
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
        Ask to add, remove, or reword a question, change an MCQ&apos;s options, or generate 1-3 new questions for a
        subtopic — say &quot;that&apos;s all&quot; when you&apos;re done.
      </p>

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
    </div>
  );
}
