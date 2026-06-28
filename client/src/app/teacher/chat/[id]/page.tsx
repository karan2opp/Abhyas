"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Send, Bot, CheckCircle, FileText, ChevronRight, Loader2, Circle, CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ExamPreviewUI = ({ examData }: { examData: any }) => {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!examData || !examData.sections) return null;

  return (
    <div className="mt-6 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {examData.sections.map((section: any, sIdx: number) => {
        const isExpanded = expandedSections[sIdx] ?? true;
        
        return (
          <div key={sIdx} className="bg-[#111520]/80 border border-white/10 shadow-xl overflow-hidden rounded-xl">
            <div 
              className="bg-[#1a1f2e] px-6 py-4 flex items-center justify-between border-b border-white/5 cursor-pointer hover:bg-[#1a1f2e]/80 transition-colors"
              onClick={() => toggleSection(sIdx)}
            >
              <div className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded">S{sIdx + 1}</span>
                  <h3 className="text-xl font-bold text-white tracking-tight">{section.title || section.name || `Section ${sIdx + 1}`}</h3>
                </div>
              </div>
              <div className="text-gray-400">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>

            {isExpanded && (
              <div className="p-4 space-y-4 bg-[#0a0d14]/50">
                {section.questions?.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="bg-[#1a1f2e]/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-sm hover:shadow-md hover:border-white/10 transition-all group">
                    <div className="absolute top-0 left-0 bg-purple-500/10 text-purple-400 font-mono text-xs font-bold px-3 py-1.5 rounded-br-xl border-b border-r border-purple-500/20">
                      Q{qIdx + 1}
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider",
                          q.type === 'mcq' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {q.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}
                        </span>
                        <span className="border border-white/10 bg-white/5 px-2.5 py-1 rounded-md text-gray-300 text-[10px] font-bold">Marks: {q.marks || 1}</span>
                      </div>
                      
                      <div className="text-white text-[15px] leading-relaxed mb-6 font-medium prose prose-invert max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({node, ...props}) => {
                              const isInline = !props.className?.includes('language-');
                              return isInline 
                                ? <code className="bg-purple-500/10 px-1.5 py-0.5 rounded text-[13px] text-purple-300 font-mono border border-purple-500/20" {...props} /> 
                                : (
                                  <div className="my-5 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-2xl">
                                    <div className="bg-white/5 px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                      <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                                      <span className="ml-3 text-xs font-mono text-gray-500 tracking-wider uppercase">{props.className?.replace('language-', '') || 'code'}</span>
                                    </div>
                                    <div className="p-5 overflow-x-auto custom-scrollbar">
                                      <code className="block font-mono text-[13px] leading-relaxed text-gray-300" {...props} />
                                    </div>
                                  </div>
                                )
                            },
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                          }}
                        >
                          {q.description || q.question || q.text || "No question text provided."}
                        </ReactMarkdown>
                      </div>

                      {q.type === 'mcq' && q.options && (
                        <div className="space-y-2.5 max-w-3xl">
                          {q.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx} className={cn(
                              "flex items-center p-3.5 rounded-xl border text-[14px] transition-all duration-200",
                              opt.isCorrect 
                                ? "bg-green-500/10 border-green-500/30 text-green-300 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]"
                                : "bg-[#111520] border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10"
                            )}>
                              {opt.isCorrect ? <CheckCircle2 className="h-4 w-4 mr-3.5 shrink-0 text-green-400" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-600 mr-3.5 shrink-0" />}
                              <span className="font-medium">{opt.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [examGeneratedId, setExamGeneratedId] = useState<string | null>(null);
  const [isSavingExam, setIsSavingExam] = useState(false);


  // Load and cleanup local storage drafts
  useEffect(() => {
    const draftKey = `chat_${chatId}_exam_draft`;
    try {
      // Cleanup old drafts across all chats
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("chat_") && key?.endsWith("_exam_draft")) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.timestamp && Date.now() - parsed.timestamp > 48 * 60 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          }
        }
      }

      // Load current chat draft if exists
      const currentDraft = localStorage.getItem(draftKey);
      if (currentDraft) {
        // Cached exam data logic removed to prevent render loops
      }
    } catch (e) {
      console.error("Local storage error:", e);
    }
  }, [chatId]);

  useEffect(() => {
    let isMounted = true;
    const fetchChat = async () => {
      try {
        const res = await api.get(`/chat/${chatId}`);
        if (isMounted) setMessages(res.data.data.messages);
        
        const initialMsg = searchParams.get('initialMessage');
        // if this is a brand new chat, we need to send the initial message
        if (initialMsg && res.data.data.messages.length === 0 && isMounted) {
          router.replace(`/teacher/chat/${chatId}`); // clear param from URL
          sendMessage(initialMsg); // fire off to AI!
        }
      } catch (err: any) {
        toast.error("Failed to load chat");
        router.push("/teacher/chat");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchChat();
    return () => { isMounted = false; };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const extractJson = (text: string) => {
    try {
      const parts = text.split("[EXAM_DATA]");
      if (parts.length > 1) {
        let jsonStr = parts[1].split("[/EXAM_DATA]")[0].trim();
        const startIdx = jsonStr.indexOf("{");
        const endIdx = jsonStr.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1) {
          jsonStr = jsonStr.substring(startIdx, endIdx + 1);
          // Fix common Mistral/LLM JSON syntax errors (missing commas between objects, trailing commas)
          jsonStr = jsonStr.replace(/\}\s*\{/g, '},{');
          jsonStr = jsonStr.replace(/\]\s*\[/g, '],[');
          jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
          
          let parsed = JSON.parse(jsonStr);
          if (parsed.exam) parsed = parsed.exam; // Normalize if wrapped in 'exam'
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse JSON", e);
    }
    return null;
  };

  const handleSaveExam = async (examData: any) => {
    setIsSavingExam(true);
    try {
      const isScheduled = examData.type === "SCHEDULED" || examData.type?.toLowerCase() === "scheduled" || examData.examType === "fixed" || examData.examType?.toLowerCase() === "scheduled";
      const type = isScheduled ? "SCHEDULED" : "ON_DEMAND";
      
      let calculatedMarks = 0;
      if (examData.sections && Array.isArray(examData.sections)) {
        examData.sections.forEach((s: any) => {
          if (s.questions && Array.isArray(s.questions)) {
            s.questions.forEach((q: any) => {
              calculatedMarks += Number(q.marks || 1);
            });
          }
        });
      }
      
      const payload: any = {
        title: examData.title || "AI Generated Exam",
        description: examData.description || "",
        type,
        totalMarks: examData.totalMarks || calculatedMarks || 100,
        instructions: ["Please read all questions carefully."],
        requireFeedback: false
      };
      
      if (type === "SCHEDULED") {
        payload.startTime = examData.windowStart || new Date().toISOString();
        payload.endTime = examData.windowEnd || new Date(Date.now() + 3600000).toISOString();
      } else {
        payload.duration = examData.duration || 60;
      }

      // Create Exam
      const res = await api.post("/exams", payload);
      const newExamId = res.data.data.id || res.data.data._id;

      // Create Sections and Questions
      for (const section of examData.sections) {
        const secRes = await api.post("/sections", {
          examId: newExamId,
          title: section.title || section.name || "Exam Section"
        });
        
        const sectionId = secRes.data.data.id || secRes.data.data._id;

        for (const q of section.questions) {
          const payload: any = {
            sectionId,
            type: q.type === "mcq" ? "mcq" : "descriptive",
            description: q.description || q.question || q.text || "No description provided.",
            marks: q.marks || 1
          };
          if (q.type === "mcq" && q.options) {
            payload.options = q.options;
          }
          await api.post("/questions", payload);
        }
      }
      
      setExamGeneratedId(newExamId);
      toast.success("Exam successfully created!");
      
      try {
        await api.post(`/chat/${chatId}/system-message`, {
          message: `EXAM_SAVED_SUCCESSFULLY:${newExamId}`
        });
      } catch (e) {}
      
      // Clear local storage on success
      try {
        localStorage.removeItem(`chat_${chatId}_exam_draft`);
      } catch (e) {}
      
      window.location.href = `/teacher/exams/${newExamId}?step=2`;
      
    } catch (error: any) {
      // Enhanced Error Reporting for Zod validation failures
      const errorMsg = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;
      
      console.error("Save Error:", error.response?.data);
      
      if (validationErrors && Array.isArray(validationErrors)) {
        toast.error(`Validation Failed: ${validationErrors[0]?.message || 'Check your exam data'}`);
      } else if (errorMsg) {
        toast.error(`Error: ${errorMsg}`);
      } else {
        toast.error("Failed to save generated exam. Check console for details.");
      }
    } finally {
      setIsSavingExam(false);
    }
  };

  async function sendMessage(userMsg: string) {
    if (sending) return;
    
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const res = await api.post(`/chat/${chatId}/message`, { message: userMsg });
      const aiReply = res.data.data.reply;
      setMessages(prev => [...prev, { role: "assistant", content: aiReply }]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    
    const userMsg = input.trim();
    setInput("");
    await sendMessage(userMsg);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14]">
      {/* Header */}
      <div className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#0a0d14]/80 backdrop-blur-xl flex items-center px-6 shrink-0 shadow-sm">
        <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-400" />
          AI Exam Assistant
        </h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-purple-500 h-8 w-8" />
          </div>
        ) : (
          messages.map((msg, idx) => {
            let displayText = msg.content;
          let isExamReady = false;
          let examData = null;

          // Strip EXAM_DATA from display
          if (displayText.includes("[EXAM_DATA]")) {
            isExamReady = true;
            const parsed = extractJson(msg.content);
            if (parsed) {
              examData = parsed;
              // Save to local storage asynchronously to avoid render blocking
              setTimeout(() => {
                try {
                  localStorage.setItem(`chat_${chatId}_exam_draft`, JSON.stringify({
                    data: parsed,
                    timestamp: Date.now()
                  }));
                } catch(e){}
              }, 0);
            }
            // Remove the block from what is displayed to the user
            displayText = displayText.replace(/\[EXAM_DATA\][\s\S]*?\[\/EXAM_DATA\]/, "").trim();
          }

          if (msg.role === "assistant" && msg.content.includes("EXAM_CONFIRMED")) {
            const parts = msg.content.split("EXAM_CONFIRMED");
            displayText = parts[0].trim();
          } else if (msg.role === "assistant" && msg.content.includes("[GENERATE_MODE]")) {
            displayText = msg.content.replace("[GENERATE_MODE]", "").trim();
          }

          if (msg.role === "system" && msg.content.startsWith("EXAM_SAVED_SUCCESSFULLY:")) {
            return null; // hide system messages from UI
          }

          let isExamSaved = false;
          let savedExamId = null;

          if (isExamReady) {
            for (let i = idx + 1; i < messages.length; i++) {
              if (messages[i].content.startsWith("EXAM_SAVED_SUCCESSFULLY:")) {
                isExamSaved = true;
                savedExamId = messages[i].content.split(":")[1].trim();
                break;
              }
              if (messages[i].content.includes("[EXAM_DATA]")) {
                break; // Another exam was generated later, so this one is obsolete
              }
            }
          }

          const showSaveButton = isExamReady && examData && !isExamSaved;
          const displaySuccessBlock = isExamSaved || (isExamReady && examGeneratedId === examData?.id); 
          // Wait, examData doesn't have an id yet. We can just use the local examGeneratedId if showSaveButton is false due to local save, but since we set it remotely, we can rely on savedExamId or local examGeneratedId.
          const successIdToOpen = savedExamId || examGeneratedId;

          return (
            <div key={idx} className={cn("flex gap-4 max-w-4xl mx-auto w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-purple-900/50">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div className={cn("flex flex-col gap-4 w-full", msg.role === "user" ? "items-end max-w-[85%]" : "items-start max-w-[92%]")}>
                {/* Text Bubble */}
                {displayText && (
                  <div className={cn(
                    "px-5 py-4 w-fit",
                    msg.role === "user" 
                      ? "bg-[#1a1f2e] text-white border border-white/10 rounded-2xl rounded-br-sm" 
                      : "bg-[#111520] text-gray-200 border border-white/5 rounded-2xl rounded-tl-sm"
                  )}>
                    <div className="text-[15px] space-y-3">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                          p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />,
                          li: ({node, ...props}) => <li className="text-gray-200" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mt-4 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mt-4 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-md font-bold text-white mt-3 mb-2" {...props} />,
                          h4: ({node, ...props}) => <h4 className="text-base font-bold text-white mt-3 mb-2" {...props} />,
                          a: ({node, ...props}) => <a className="text-purple-400 hover:underline" {...props} />,
                          code: ({node, ...props}) => {
                            const isInline = !props.className?.includes('language-');
                            return isInline 
                              ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-purple-300" {...props} /> 
                              : <code className="block bg-black/30 p-3 rounded-lg font-mono text-sm overflow-x-auto my-2 border border-white/5" {...props} />
                          },
                        }}
                      >
                        {displayText}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Exam Generation Card */}
                {msg.role === "assistant" && isExamReady && examData && (
                  <div className="w-full mt-2">
                    <div className="bg-gradient-to-br from-[#0b0f19] to-purple-900/10 rounded-2xl p-6 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)] relative overflow-hidden max-w-4xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] pointer-events-none" />
                      <div className="flex flex-col gap-6 relative z-10">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 p-3.5 rounded-xl border border-purple-500/20">
                              <FileText className="h-6 w-6 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-[16px]">{examData.title || "AI Generated Exam"}</h4>
                              <p className="text-sm text-gray-400 mt-0.5">{examData.sections?.length || 0} Sections</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => {
                              if (isExamSaved) {
                                window.location.href = `/teacher/exams/${successIdToOpen}?step=2`;
                              } else {
                                handleSaveExam(examData);
                              }
                            }} 
                            disabled={isSavingExam}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.01]"
                          >
                            {isSavingExam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                            {isSavingExam ? "Preparing Builder..." : "Save Exam & Open Builder"}
                          </Button>
                        </div>
                        
                        <div className="w-full h-px bg-white/10" />
                        
                        <div className="w-full">
                          <h4 className="text-gray-300 font-semibold mb-2">Exam Preview:</h4>
                          <ExamPreviewUI examData={examData} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }))}

        {sending && (
          <div className="flex gap-4 max-w-4xl mx-auto w-full justify-start animate-pulse">
            <div className="w-8 h-8 rounded-full bg-purple-600/50 flex items-center justify-center shrink-0 mt-1">
              <Bot className="h-4 w-4 text-white/50" />
            </div>
            <div className="bg-[#111520] border border-white/5 text-gray-400 rounded-2xl rounded-tl-sm px-5 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        {isSavingExam && (
          <div className="flex justify-center my-4">
            <div className="bg-purple-500/10 text-purple-400 px-4 py-2 rounded-full flex items-center gap-2 text-sm border border-purple-500/20">
              <Loader2 className="animate-spin h-4 w-4" /> Saving your exam...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0a0d14] pt-8 shrink-0 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto relative">
          <form onSubmit={handleSend} className="relative flex items-end bg-[#111520] border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 transition-all">
            <TextareaAutosize 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type your message here..."
              className="flex-1 max-h-32 min-h-[56px] w-full resize-none bg-transparent py-4 pl-4 pr-12 text-[15px] text-white placeholder:text-gray-500 focus:outline-none custom-scrollbar"
              disabled={sending}
            />
            <div className="absolute right-2 bottom-2">
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || sending}
                className={cn(
                  "h-10 w-10 rounded-xl transition-all mb-1 mr-1",
                  input.trim() ? "bg-white text-black hover:bg-gray-200" : "bg-white/5 text-gray-500"
                )}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <div className="text-center mt-2">
            <p className="text-[11px] text-gray-500">AI can make mistakes. Please verify the exam questions before assigning to students.</p>
          </div>
        </div>
      </div>
    </div>
  );
}



// Simple growing textarea
function TextareaAutosize({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <textarea 
      ref={textareaRef}
      className={className}
      rows={1}
      {...props}
    />
  );
}
