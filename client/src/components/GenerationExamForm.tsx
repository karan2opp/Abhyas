"use client";

import React, { useState } from "react";
import { Plus, X, Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExamInput, SectionInput, QuestionType, Difficulty, EducationCategory, EducationLevel } from "@/services/generationAgents.service";

interface TopicRow {
  id: string;
  value: string;
}

// Common concrete levels, each pre-mapped to its category so picking "Class 8"
// doesn't also require picking "Middle School" separately.
const COMMON_EDUCATION_LEVELS: { value: string; category: EducationCategory }[] = [
  ...Array.from({ length: 5 }, (_, i) => ({ value: `Class ${i + 1}`, category: "Lower Middle School" as EducationCategory })),
  ...Array.from({ length: 3 }, (_, i) => ({ value: `Class ${i + 6}`, category: "Middle School" as EducationCategory })),
  ...Array.from({ length: 2 }, (_, i) => ({ value: `Class ${i + 9}`, category: "High School" as EducationCategory })),
  ...Array.from({ length: 2 }, (_, i) => ({ value: `Class ${i + 11}`, category: "Senior Secondary" as EducationCategory })),
  { value: "Undergraduate", category: "Undergraduate" },
  { value: "Postgraduate", category: "Postgraduate" },
  { value: "Professional", category: "Professional" },
];

const EDUCATION_CATEGORIES: EducationCategory[] = [
  "Lower Middle School",
  "Middle School",
  "High School",
  "Senior Secondary",
  "Undergraduate",
  "Postgraduate",
  "Professional",
  "Not Specified",
];

interface SectionRow {
  id: string;
  name: string;
  subject: string;
  question_type: QuestionType;
  question_count: string;
  marks: string;
  topics: TopicRow[];
}

const newTopic = (): TopicRow => ({ id: Date.now().toString() + Math.random(), value: "" });

const newSection = (index: number): SectionRow => ({
  id: Date.now().toString() + Math.random(),
  name: `Section ${String.fromCharCode(65 + index)}`,
  subject: "",
  question_type: "mcq",
  question_count: "5",
  marks: "1",
  topics: [newTopic()],
});

export default function GenerationExamForm({
  onSubmit,
  onSubmitVoice,
  isSubmitting,
}: {
  onSubmit: (examInput: ExamInput) => void;
  onSubmitVoice?: (examInput: ExamInput) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [sections, setSections] = useState<SectionRow[]>([newSection(0)]);

  // Education level: pick a common level, type a custom one, or leave unspecified.
  const [educationChoice, setEducationChoice] = useState<string>("not-specified");
  const [customLevelValue, setCustomLevelValue] = useState("");
  const [customLevelCategory, setCustomLevelCategory] = useState<EducationCategory>("Not Specified");

  const addInstruction = () => setInstructions((prev) => [...prev, ""]);
  const removeInstruction = (idx: number) =>
    setInstructions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0 ? [""] : next;
    });
  const updateInstruction = (idx: number, val: string) =>
    setInstructions((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const addSection = () => setSections((prev) => [...prev, newSection(prev.length)]);
  const removeSection = (id: string) => {
    if (sections.length === 1) {
      toast.error("You must have at least one section");
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== id));
  };
  const updateSection = (id: string, field: keyof SectionRow, value: any) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const addTopic = (sectionId: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, topics: [...s.topics, newTopic()] } : s))
    );
  const removeTopic = (sectionId: string, topicId: string) =>
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const next = s.topics.filter((t) => t.id !== topicId);
        return { ...s, topics: next.length === 0 ? [newTopic()] : next };
      })
    );
  const updateTopic = (sectionId: string, topicId: string, value: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, topics: s.topics.map((t) => (t.id === topicId ? { ...t, value } : t)) }
          : s
      )
    );

  const totalQuestions = sections.reduce((acc, s) => acc + (Number(s.question_count) || 0), 0);
  const totalMarks = sections.reduce(
    (acc, s) => acc + (Number(s.question_count) || 0) * (Number(s.marks) || 0),
    0
  );
  const instructionCount = instructions.filter((i) => i.trim() !== "").length;

  const resolveEducationLevel = (): EducationLevel | undefined => {
    if (educationChoice === "not-specified") return undefined;
    if (educationChoice === "custom") {
      if (!customLevelValue.trim()) return undefined;
      return { value: customLevelValue.trim(), category: customLevelCategory };
    }
    const found = COMMON_EDUCATION_LEVELS.find((l) => l.value === educationChoice);
    return found ? { value: found.value, category: found.category } : undefined;
  };

  const buildExamInput = (): ExamInput | null => {
    const invalid = sections.some(
      (s) =>
        !s.name.trim() ||
        !s.subject.trim() ||
        !s.topics.some((t) => t.value.trim() !== "") ||
        Number(s.question_count) <= 0
    );
    if (invalid) {
      toast.error("Every section needs a name, subject, at least one topic, and a question count");
      return null;
    }

    return {
      title: title.trim() || undefined,
      instructions: instructions.map((i) => i.trim()).filter(Boolean),
      difficulty: difficulty || undefined,
      educationLevel: resolveEducationLevel(),
      sections: sections.map(
        (s): SectionInput => ({
          name: s.name.trim(),
          subject: s.subject.trim(),
          question_type: s.question_type,
          question_count: Math.max(1, Math.round(Number(s.question_count) || 1)),
          marks: Math.max(0.5, Number(s.marks) || 1),
          topics: s.topics.map((t) => t.value.trim()).filter(Boolean),
        })
      ),
    };
  };

  const handleSubmit = () => {
    const examInput = buildExamInput();
    if (examInput) onSubmit(examInput);
  };

  const handleSubmitVoice = () => {
    const examInput = buildExamInput();
    if (examInput) onSubmitVoice?.(examInput);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 space-y-5">
        {/* Exam-level fields */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Exam Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JavaScript Basics Test"
              className="bg-[#111114] border-white/10 text-gray-200 h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Difficulty (whole exam)</label>
              <Select value={difficulty || "none"} onValueChange={(v) => setDifficulty(v === "none" ? "" : (v as Difficulty))}>
                <SelectTrigger className="w-full bg-[#111114] border-white/10 text-gray-200 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111114] border-white/10 text-gray-200">
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Education Level</label>
              <Select value={educationChoice} onValueChange={(v) => setEducationChoice(v || "not-specified")}>
                <SelectTrigger className="w-full bg-[#111114] border-white/10 text-gray-200 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111114] border-white/10 text-gray-200">
                  <SelectItem value="not-specified">Not specified</SelectItem>
                  {COMMON_EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.value}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {educationChoice === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Custom Level</label>
                <Input
                  value={customLevelValue}
                  onChange={(e) => setCustomLevelValue(e.target.value)}
                  placeholder="e.g. B.Tech 2nd Year"
                  className="bg-[#111114] border-white/10 text-gray-200 h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Closest Category</label>
                <Select value={customLevelCategory} onValueChange={(v) => setCustomLevelCategory(v as EducationCategory)}>
                  <SelectTrigger className="w-full bg-[#111114] border-white/10 text-gray-200 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111114] border-white/10 text-gray-200">
                    {EDUCATION_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Global instructions */}
        <div className="space-y-2 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Global Instructions</label>
            <Button type="button" variant="ghost" onClick={addInstruction} className="h-6 px-0 text-xs text-orange-400 hover:text-orange-300">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {instructions.map((inst, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={inst}
                  onChange={(e) => updateInstruction(idx, e.target.value)}
                  placeholder={`Instruction ${idx + 1}...`}
                  className="bg-[#111114] border-white/10 text-gray-200 h-8 text-xs"
                />
                {instructions.length > 1 && (
                  <button type="button" onClick={() => removeInstruction(idx)} className="text-gray-500 hover:text-red-400 p-1 shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sections</label>
            <Button type="button" onClick={addSection} size="sm" className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
            </Button>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="bg-[#111114] border border-white/10 rounded-lg p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Section Name</label>
                      <Input
                        value={section.name}
                        onChange={(e) => updateSection(section.id, "name", e.target.value)}
                        className="bg-[#0a0a0a] border-white/10 text-gray-200 h-8 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Subject</label>
                      <Input
                        value={section.subject}
                        onChange={(e) => updateSection(section.id, "subject", e.target.value)}
                        placeholder="e.g. JavaScript"
                        className="bg-[#0a0a0a] border-white/10 text-gray-200 h-8 text-xs font-semibold"
                      />
                    </div>
                  </div>
                  {sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(section.id)} className="text-gray-500 hover:text-red-400 p-1 mt-4 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Topics */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Topics</label>
                    <Button type="button" onClick={() => addTopic(section.id)} variant="ghost" className="h-6 px-0 text-xs text-orange-400 hover:text-orange-300">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Topic
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section.topics.map((topic) => (
                      <div key={topic.id} className="flex items-center gap-2">
                        <Input
                          value={topic.value}
                          onChange={(e) => updateTopic(section.id, topic.id, e.target.value)}
                          placeholder="Topic name"
                          className="bg-[#0a0a0a] border-white/10 text-gray-200 h-8 text-xs flex-1"
                        />
                        {section.topics.length > 1 && (
                          <button type="button" onClick={() => removeTopic(section.id, topic.id)} className="text-gray-500 hover:text-red-400 p-1 shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Type, count, marks */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Type</label>
                    <Select value={section.question_type} onValueChange={(v) => updateSection(section.id, "question_type", v as QuestionType)}>
                      <SelectTrigger className="w-full bg-[#0a0a0a] border-white/10 text-gray-200 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border-white/10 text-gray-200">
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="descriptive">Descriptive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Questions</label>
                    <Input
                      type="number"
                      min="1"
                      value={section.question_count}
                      onChange={(e) => updateSection(section.id, "question_count", e.target.value)}
                      className="bg-[#0a0a0a] border-white/10 text-gray-200 h-8 text-xs text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Marks / Q</label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={section.marks}
                      onChange={(e) => updateSection(section.id, "marks", e.target.value)}
                      className="bg-[#0a0a0a] border-white/10 text-gray-200 h-8 text-xs text-center"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold h-10">
            {isSubmitting ? "Starting..." : "Start Conversation"}
          </Button>
          {onSubmitVoice && (
            <Button
              onClick={handleSubmitVoice}
              disabled={isSubmitting}
              variant="outline"
              className="h-10 px-4 border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 font-semibold"
            >
              <Mic className="h-4 w-4 mr-2" /> Voice
            </Button>
          )}
        </div>
      </div>

      {/* Live summary */}
      <Card className="bg-[#0a0a0a] border-white/10 rounded-xl p-4 space-y-3 sticky top-4">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 pb-2.5">Summary</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#111114] border border-white/5 text-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Sections</span>
            <span className="text-base font-extrabold text-white">{sections.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#111114] border border-white/5 text-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Questions</span>
            <span className="text-base font-extrabold text-orange-400">{totalQuestions}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#111114] border border-white/5 text-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Marks</span>
            <span className="text-base font-extrabold text-emerald-400">{totalMarks}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#111114] border border-white/5 text-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Difficulty</span>
            <span className="text-xs font-bold text-white capitalize">{difficulty || "—"}</span>
          </div>
        </div>
        {instructionCount > 0 && (
          <div className="p-2.5 rounded-lg bg-[#111114] border border-white/5 text-xs flex items-center justify-between">
            <span className="text-gray-400">Instructions</span>
            <span className="text-white font-bold">{instructionCount}</span>
          </div>
        )}
        {educationChoice !== "not-specified" && (
          <div className="p-2.5 rounded-lg bg-[#111114] border border-white/5 text-xs flex items-center justify-between">
            <span className="text-gray-400">Education Level</span>
            <span className="text-white font-bold">
              {educationChoice === "custom" ? (customLevelValue.trim() || "—") : educationChoice}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
