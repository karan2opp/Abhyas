"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Bot } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/chat/init", { model: selectedModel });
      const newChat = res.data.data;
      router.push(`/teacher/chat/${newChat._id}?initialMessage=${encodeURIComponent(input)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start chat");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14]">
      {/* Header (matches [id]/page.tsx) */}
      <div className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#0a0d14]/80 backdrop-blur-xl flex items-center px-6 shrink-0 shadow-sm">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bot className="h-5 w-5 text-gray-400" />
          AI Exam Assistant
        </h2>
      </div>

      {/* Main content centered vertically for empty state */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 z-10 relative">
        <div className="w-16 h-16 bg-[#111520] border border-white/10 rounded-2xl flex items-center justify-center mb-6 relative z-10">
          <Bot className="h-8 w-8 text-gray-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 text-center tracking-tight">How can I help you?</h2>
        <p className="text-gray-400 mb-8 max-w-md text-center leading-relaxed text-[14px]">
          Describe the exam you want to create. I can generate questions, set time limits, and organize sections for you.
        </p>

        <div className="flex flex-wrap justify-center gap-3 text-[13px] relative z-10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-gray-300">
            <Sparkles className="h-3.5 w-3.5 text-gray-400" /> Context-aware generation
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-gray-300">
            <Sparkles className="h-3.5 w-3.5 text-gray-400" /> Remembers previous chats
          </div>
        </div>
      </div>

      {/* Bottom Input Area (matches [id]/page.tsx) */}
      <div className="p-4 bg-[#0a0d14] pt-8 shrink-0 relative z-20">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute -top-10 right-0">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#111520] text-gray-400 border border-white/10 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-white/20"
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Default)</option>
              <option value="mistral-small-latest">Mistral Small Latest</option>
            </select>
          </div>
          <form onSubmit={handleStart} className="flex relative">
            <Input 
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 bg-[#111520] border border-white/10 text-white shadow-none focus-visible:ring-1 focus-visible:ring-purple-500/50 text-[15px] h-14 pl-5 pr-14 rounded-2xl placeholder:text-gray-600"
              disabled={loading}
            />
            <div className="absolute right-2 top-2">
              <Button 
                type="submit" 
                disabled={!input.trim() || loading}
                size="icon"
                className={`h-10 w-10 rounded-xl transition-all ${input.trim() ? "bg-white text-black hover:bg-gray-200" : "bg-white/5 text-gray-500"}`}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <div className="text-center mt-3">
            <p className="text-[11px] text-gray-500">AI can make mistakes. Please verify the exam questions before assigning to students.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
