"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Send, FlaskConical, Terminal, RotateCcw, Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  startExamIntentConversation,
  continueExamIntentConversation,
  triggerBlueprintGeneration,
  getBlueprintStatus,
  triggerQuestionGeneration,
  getQuestionsStatus,
  triggerTestPipelineService,
  ExamInput,
  ConversationTurn,
  ConversationSummary,
  BlueprintStatus,
  ExamBlueprint,
  QuestionsStatus,
  GeneratedExam,
} from "@/services/generationAgents.service";
import GenerationExamForm from "@/components/GenerationExamForm";
import { useRealtimeVoiceAgent } from "@/hooks/useRealtimeVoiceAgent";

export default function GenerationAgentLab() {
  // ── Conversation agent state ──
  // sessionId is the source of truth for continuing a conversation — the
  // server reconstructs history from its own DB, this local `history` is
  // only kept for rendering the chat thread.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [reply, setReply] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const voice = useRealtimeVoiceAgent({
    agent: "intent",
    onToolResult: (name, result) => {
      if (name === "save_exam_intent_summary") {
        setSummary(result.summary || null);
        setDone(true);
      }
    },
  });

  // ── Subtopic blueprint state ──
  const [blueprintStatus, setBlueprintStatus] = useState<BlueprintStatus | null>(null);
  const [blueprint, setBlueprint] = useState<ExamBlueprint | null>(null);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const pollingRef = useRef(false);

  // ── Generated questions state ──
  const [questionsStatus, setQuestionsStatus] = useState<QuestionsStatus | null>(null);
  const [questions, setQuestions] = useState<GeneratedExam | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const questionsPollingRef = useRef(false);

  useEffect(() => () => {
    pollingRef.current = false;
    questionsPollingRef.current = false;
  }, []);

  // ── Inngest test pipeline state ──
  const [pipelinePayload, setPipelinePayload] = useState(`{ "note": "hello from the lab" }`);
  const [pipelineResult, setPipelineResult] = useState<string>("");
  const [isFiring, setIsFiring] = useState(false);

  const startConversation = async (input: ExamInput) => {
    setIsThinking(true);
    try {
      const result = await startExamIntentConversation(input);
      setSessionId(result.sessionId);
      setHistory([{ role: "assistant", content: result.message }]);
      setDone(result.done);
      setSummary(result.summary || null);
      setStarted(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to start conversation");
    } finally {
      setIsThinking(false);
    }
  };

  const startVoiceConversation = async (input: ExamInput) => {
    setIsVoiceMode(true);
    setStarted(true);
    setDone(false);
    setSummary(null);
    try {
      const newSessionId = await voice.start({ examInput: input });
      setSessionId(newSessionId);
    } catch {
      toast.error(voice.error || "Failed to start voice conversation");
      setStarted(false);
      setIsVoiceMode(false);
    }
  };

  const sendReply = async () => {
    if (!sessionId || !reply.trim()) return;

    const outgoing = reply.trim();
    setHistory((prev) => [...prev, { role: "user", content: outgoing }]);
    setReply("");
    setIsThinking(true);
    try {
      const result = await continueExamIntentConversation(sessionId, outgoing);
      setHistory((prev) => [...prev, { role: "assistant", content: result.message }]);
      setDone(result.done);
      setSummary(result.summary || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Conversation turn failed");
    } finally {
      setIsThinking(false);
    }
  };

  const generateBlueprint = async () => {
    if (!sessionId) return;
    pollingRef.current = true;
    setBlueprintStatus("in_progress");
    setBlueprint(null);
    setBlueprintError(null);

    try {
      await triggerBlueprintGeneration(sessionId);

      while (pollingRef.current) {
        await new Promise((r) => setTimeout(r, 2000));
        if (!pollingRef.current) break;

        const result = await getBlueprintStatus(sessionId);
        setBlueprintStatus(result.blueprintStatus);

        if (result.blueprintStatus === "completed") {
          setBlueprint(result.blueprint);
          break;
        }
        if (result.blueprintStatus === "failed") {
          setBlueprintError(result.blueprintError || "Unknown error");
          break;
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate subtopics");
      setBlueprintStatus(null);
    }
  };

  const generateQuestions = async () => {
    if (!sessionId) return;
    questionsPollingRef.current = true;
    setQuestionsStatus("in_progress");
    setQuestions(null);
    setQuestionsError(null);

    try {
      await triggerQuestionGeneration(sessionId);

      while (questionsPollingRef.current) {
        await new Promise((r) => setTimeout(r, 2000));
        if (!questionsPollingRef.current) break;

        const result = await getQuestionsStatus(sessionId);
        setQuestionsStatus(result.questionsStatus);
        setQuestions(result.questions);

        if (result.questionsStatus === "completed") break;
        if (result.questionsStatus === "failed") {
          setQuestionsError(result.questionsError || "Unknown error");
          break;
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate questions");
      setQuestionsStatus(null);
    }
  };

  const resetConversation = () => {
    pollingRef.current = false;
    questionsPollingRef.current = false;
    voice.stop();
    setIsVoiceMode(false);
    setSessionId(null);
    setHistory([]);
    setStarted(false);
    setDone(false);
    setSummary(null);
    setReply("");
    setBlueprintStatus(null);
    setBlueprint(null);
    setBlueprintError(null);
    setQuestionsStatus(null);
    setQuestions(null);
    setQuestionsError(null);
  };

  const firePipelineTest = async () => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(pipelinePayload);
    } catch {
      toast.error("Pipeline payload is not valid JSON");
      return;
    }

    setIsFiring(true);
    setPipelineResult("");
    try {
      const result = await triggerTestPipelineService(payload);
      setPipelineResult(JSON.stringify(result, null, 2));
      toast.success("Event fired — check the terminal or the Inngest dashboard for the trace");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fire test event");
    } finally {
      setIsFiring(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 text-gray-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-orange-500" />
          Generation Agent Lab
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Dev harness for the new generation pipeline — talk to the conversation agent and fire test events into Inngest.
        </p>
      </div>

      {/* Conversation Agent */}
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Conversation Agent</h2>
          {started && (
            <Button variant="ghost" size="sm" onClick={resetConversation} className="text-gray-400 hover:text-white">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
          )}
        </div>

        {!started ? (
          <GenerationExamForm onSubmit={startConversation} onSubmitVoice={startVoiceConversation} isSubmitting={isThinking} />
        ) : (
          <div className="space-y-4">
            {isVoiceMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      voice.status === "connected"
                        ? "bg-green-500/10 text-green-400"
                        : voice.status === "connecting"
                        ? "bg-orange-500/10 text-orange-300"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {voice.status === "connected" ? "Live" : voice.status}
                  </span>
                  <Button
                    onClick={() => voice.stop()}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                  >
                    <MicOff className="h-3 w-3 mr-1" /> End Call
                  </Button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {voice.transcript.length === 0 && <p className="text-xs text-gray-500 italic">Listening...</p>}
                  {voice.transcript.map((turn, i) => (
                    <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm ${
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
                        className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm italic opacity-70 ${
                          voice.partial.role === "user" ? "bg-orange-600 text-white" : "bg-zinc-900 border border-white/10 text-gray-200"
                        }`}
                      >
                        {voice.partial.text}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {history.map((turn, i) => (
                  <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm [&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside [&_p:not(:last-child)]:mb-2 ${
                        turn.role === "user"
                          ? "bg-orange-600 text-white"
                          : "bg-zinc-900 border border-white/10 text-gray-200"
                      }`}
                    >
                      <ReactMarkdown>{turn.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isThinking && <p className="text-xs text-gray-500 italic">Agent is thinking...</p>}
              </div>
            )}

            {done ? (
              <div className="space-y-3">
                <div className="text-sm text-green-400 font-medium border border-green-500/20 bg-green-500/10 rounded-lg px-3.5 py-2.5">
                  Conversation complete — enough information gathered.
                </div>
                {summary && (
                  <div className="border border-white/10 bg-[#111114] rounded-lg p-3.5 space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gathered Summary</h4>
                    {summary.globalInstructions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wide">Global</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {summary.globalInstructions.map((inst, i) => (
                            <li key={i} className="text-xs text-gray-300">{inst}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.topicSpecificInstructions.map((t, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wide">{t.topic}</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {t.instructions.map((inst, j) => (
                            <li key={j} className="text-xs text-gray-300">{inst}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {!blueprintStatus && (
                  <Button onClick={generateBlueprint} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                    <Sparkles className="h-4 w-4 mr-2" /> Generate Subtopics
                  </Button>
                )}

                {blueprintStatus && (
                  <div className="border border-white/10 bg-[#111114] rounded-lg p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subtopic Blueprint</h4>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          blueprintStatus === "completed"
                            ? "bg-green-500/10 text-green-400"
                            : blueprintStatus === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-purple-500/10 text-purple-300"
                        }`}
                      >
                        {blueprintStatus}
                      </span>
                    </div>

                    {blueprintStatus === "in_progress" && (
                      <p className="text-xs text-gray-500 italic">Generating subtopics, one batch per section (traceable in the Inngest dashboard)...</p>
                    )}
                    {blueprintStatus === "failed" && (
                      <p className="text-xs text-red-400">{blueprintError}</p>
                    )}

                    {blueprint && (
                      <div className="space-y-4">
                        {blueprint.sections.map((section, si) => (
                          <div key={si} className="space-y-2">
                            <p className="text-xs font-bold text-white">
                              {section.name} <span className="text-gray-500 font-normal">({section.subject})</span>
                            </p>
                            {section.topics.map((topic, ti) => (
                              <div key={ti} className="pl-3 border-l border-white/10 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-orange-400">{topic.topic}</span>
                                  <span className="text-[10px] text-gray-500">
                                    {Math.round(topic.weight * 100)}% · {topic.allocatedQuestions}q
                                  </span>
                                </div>
                                <ul className="space-y-0.5">
                                  {topic.subtopics.map((sub, sbi) => (
                                    <li key={sbi} className="flex items-center justify-between text-xs text-gray-300">
                                      <span>{sub.name}</span>
                                      <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                                        {Math.round(sub.weight * 100)}% · {sub.allocatedQuestions}q
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {blueprintStatus === "completed" && blueprint && !questionsStatus && (
                  <Button onClick={generateQuestions} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold">
                    <Sparkles className="h-4 w-4 mr-2" /> Generate Questions
                  </Button>
                )}

                {questionsStatus && (
                  <div className="border border-white/10 bg-[#111114] rounded-lg p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Questions</h4>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          questionsStatus === "completed"
                            ? "bg-green-500/10 text-green-400"
                            : questionsStatus === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-orange-500/10 text-orange-300"
                        }`}
                      >
                        {questionsStatus}
                      </span>
                    </div>

                    {questionsStatus === "in_progress" && (
                      <p className="text-xs text-gray-500 italic">
                        Generating questions section by section, up to 5 topics in parallel (traceable in the Inngest dashboard)...
                      </p>
                    )}
                    {questionsStatus === "failed" && <p className="text-xs text-red-400">{questionsError}</p>}

                    {questions && questions.sections.length > 0 && (
                      <div className="space-y-5">
                        {questions.sections.map((section, si) => (
                          <div key={si} className="space-y-3">
                            <p className="text-xs font-bold text-white">
                              {section.name} <span className="text-gray-500 font-normal">({section.subject})</span>
                            </p>
                            {section.topics.map((topic, ti) => (
                              <div key={ti} className="pl-3 border-l border-white/10 space-y-2">
                                <span className="text-xs font-semibold text-orange-400">{topic.topic}</span>
                                <ol className="space-y-2 list-decimal list-inside">
                                  {topic.questions.map((q, qi) => (
                                    <li key={qi} className="text-xs text-gray-200">
                                      <span>{q.question_text}</span>
                                      <span className="text-[10px] text-gray-500 ml-1">
                                        ({q.subtopic} · {q.marks}m)
                                      </span>
                                      {q.type === "mcq" ? (
                                        <ul className="mt-1 ml-4 space-y-0.5">
                                          {q.options.map((opt, oi) => {
                                            const key = String.fromCharCode(65 + oi);
                                            const isCorrect = key === q.correct_option;
                                            return (
                                              <li
                                                key={oi}
                                                className={`text-[11px] ${isCorrect ? "text-green-400 font-semibold" : "text-gray-400"}`}
                                              >
                                                {key}. {opt}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      ) : (
                                        <ul className="mt-1 ml-4 space-y-0.5">
                                          {q.rubric.categories.map((cat, ci) => (
                                            <li key={ci} className="text-[11px] text-gray-400">
                                              {cat.name} ({Math.round(cat.weight * 100)}%)
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isThinking && sendReply()}
                  placeholder="Type your answer..."
                  className="bg-[#111114] border-white/10 text-gray-200"
                  disabled={isThinking}
                />
                <Button onClick={sendReply} disabled={isThinking || !reply.trim()} className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inngest Test Pipeline */}
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Terminal className="h-4 w-4 text-orange-500" /> Inngest Test Pipeline
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Fires the <code className="text-orange-400">generation-agent/pipeline.test</code> event. Watch the server terminal for step logs,
            or run <code className="text-orange-400">npm run inngest:dev</code> and open{" "}
            <code className="text-orange-400">localhost:8288</code> for the full trace.
          </p>
        </div>
        <Textarea
          value={pipelinePayload}
          onChange={(e) => setPipelinePayload(e.target.value)}
          rows={3}
          className="font-mono text-xs bg-[#111114] border-white/10 text-gray-200"
        />
        <Button onClick={firePipelineTest} disabled={isFiring} variant="outline" className="border-white/10 text-white hover:bg-white/10">
          {isFiring ? "Firing..." : "Fire Test Event"}
        </Button>
        {pipelineResult && (
          <pre className="text-xs bg-[#111114] border border-white/10 rounded-lg p-3 text-gray-300 overflow-x-auto">{pipelineResult}</pre>
        )}
      </div>
    </div>
  );
}
