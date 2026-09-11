"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  listQuestionBankDocuments,
  generateQuestionsFromDocuments,
  QuestionBankDocument,
  GeneratedTopicGroup,
  TopicTier,
  Difficulty,
  QuestionType,
} from "@/services/questionBank.service";

const TIER_LABEL: Record<TopicTier, string> = { high: "High Priority", mid: "Mid Priority", low: "Low Priority" };
const TIER_COLOR: Record<TopicTier, string> = {
  high: "bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400",
  mid: "bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400",
  low: "bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400",
};

function TierSection({
  tier,
  topics,
  onAdd,
  onRemove,
}: {
  tier: TopicTier;
  topics: string[];
  onAdd: (topic: string) => void;
  onRemove: (topic: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const t = value.trim();
    if (!t) return;
    onAdd(t);
    setValue("");
  };

  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{TIER_LABEL[tier]}</div>
      <div className="flex flex-wrap gap-2">
        {topics.length === 0 && <span className="text-xs italic text-muted-foreground">No topics added</span>}
        {topics.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1 ${TIER_COLOR[tier]}`}>
            {t}
            <button title="Remove" onClick={() => onRemove(t)} className="hover:opacity-70">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          placeholder={`Add a ${TIER_LABEL[tier].toLowerCase()} topic`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="max-w-64"
        />
        <Button variant="outline" size="sm" onClick={submit}>
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

function GeneratedQuestionCard({ group }: { group: GeneratedTopicGroup }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TIER_COLOR[group.tier]}`}>{TIER_LABEL[group.tier]}</span>
        <CardTitle>{group.topic}</CardTitle>
        <span className="text-xs text-muted-foreground">{group.allocatedQuestions} question(s)</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {group.questions.map((q, i) => (
          <div key={q.id} className="rounded-md border border-border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">Q{i + 1}. {q.question_text}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{q.marks} marks</span>
            </div>
            {q.type === "mcq" && q.options && (
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {q.options.map((opt, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  const isCorrect = letter === q.correct_option;
                  return (
                    <li key={oi} className={isCorrect ? "font-semibold text-green-600 dark:text-green-400" : ""}>
                      {letter}. {opt} {isCorrect && "✓"}
                    </li>
                  );
                })}
              </ul>
            )}
            {q.type === "descriptive" && q.rubric && (
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                {q.rubric.categories.map((c, ci) => (
                  <div key={ci}>
                    <span className="font-medium">{c.name}</span> (weight {c.weight}): {c.key_points.join(", ")}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function GenerateQuestionsFromDocument() {
  const [documents, setDocuments] = useState<QuestionBankDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [tiers, setTiers] = useState<{ high: string[]; mid: string[]; low: string[] }>({ high: [], mid: [], low: [] });

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [marks, setMarks] = useState(2);
  const [questionCount, setQuestionCount] = useState(6);

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedTopicGroup[] | null>(null);

  useEffect(() => {
    listQuestionBankDocuments()
      .then((docs) => setDocuments(docs.filter((d) => d.status === "completed")))
      .catch((err) => toast.error(err?.response?.data?.message || "Failed to load documents"));
  }, []);

  const toggleDocument = (id: string) => {
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
    setResults(null);
  };

  const addTopic = (tier: TopicTier, topic: string) => {
    setTiers((prev) => (prev[tier].includes(topic) ? prev : { ...prev, [tier]: [...prev[tier], topic] }));
  };
  const removeTopic = (tier: TopicTier, topic: string) => {
    setTiers((prev) => ({ ...prev, [tier]: prev[tier].filter((t) => t !== topic) }));
  };

  const handleGenerate = async () => {
    if (selectedDocIds.length === 0) {
      toast.error("Select at least one document");
      return;
    }
    if (tiers.high.length + tiers.mid.length + tiers.low.length === 0) {
      toast.error("Add at least one topic to a priority tier");
      return;
    }

    setIsGenerating(true);
    setResults(null);
    try {
      const groups = await generateQuestionsFromDocuments({
        documentIds: selectedDocIds,
        topics: tiers,
        difficulty,
        questionCount,
        questionType,
        marks,
      });
      setResults(groups);
      toast.success(`Generated ${groups.reduce((n, g) => n + g.questions.length, 0)} question(s)`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="size-5" /> Generate Questions from Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick one or more uploaded documents, add your own topics into a priority tier, and generate new questions
            grounded in that content — higher-priority topics get proportionally more questions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Select document(s)</CardTitle>
            <CardDescription>Only fully processed documents are available. Select as many as you like.</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-xs italic text-muted-foreground">
                No completed documents yet — upload one in the Question Bank Lab first.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {documents.map((doc) => {
                  const checked = selectedDocIds.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm ${checked ? "border-orange-500/50 bg-orange-500/5" : "border-border hover:bg-muted/50"}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleDocument(doc.id)} className="size-4" />
                      <span className="flex-1">{doc.title}</span>
                      <span className="text-xs text-muted-foreground">{doc.totalChunks} question(s)</span>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedDocIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Prioritize topics</CardTitle>
              <CardDescription>Type a topic and add it to a priority tier — high-priority topics get more questions.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(["high", "mid", "low"] as TopicTier[]).map((tier) => (
                <TierSection
                  key={tier}
                  tier={tier}
                  topics={tiers[tier]}
                  onAdd={(topic) => addTopic(tier, topic)}
                  onRemove={(topic) => removeTopic(tier, topic)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {selectedDocIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>3. Question settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Difficulty</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Question type</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                >
                  <option value="mcq">MCQ</option>
                  <option value="descriptive">Descriptive</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Marks / question</label>
                <Input type="number" min={1} value={marks} onChange={(e) => setMarks(Number(e.target.value) || 1)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Total questions</label>
                <Input type="number" min={1} max={50} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value) || 1)} />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedDocIds.length > 0 && (
          <Button onClick={handleGenerate} disabled={isGenerating} className="self-start">
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Generate Questions
              </>
            )}
          </Button>
        )}

        {results && (
          <div className="flex flex-col gap-4">
            {results.map((g) => (
              <GeneratedQuestionCard key={`${g.tier}-${g.topic}`} group={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
