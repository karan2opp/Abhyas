"use client";

import React from "react";
import { Sparkles, Library, BookOpen, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreationMode = "ai" | "pyq" | "source";

export const MODES: { id: CreationMode; label: string; description: string; icon: React.ElementType; available: boolean }[] = [
  {
    id: "ai",
    label: "AI Generated Questions",
    description: "Enter subjects and topics, talk through your preferences, and AI writes a fresh set of questions.",
    icon: Sparkles,
    available: true,
  },
  {
    id: "pyq",
    label: "From PYQ",
    description: "Pick uploaded past papers and pull matching questions exactly as they appeared.",
    icon: Library,
    available: true,
  },
  {
    id: "source",
    label: "From Source",
    description: "Pick an indexed textbook. Topics are matched to its chapters and AI writes new questions from its text.",
    icon: BookOpen,
    available: true,
  },
];

export const STEPS: Record<CreationMode, string[]> = {
  ai: ["Details", "Topics", "Preferences", "Subtopics", "Review", "Publish"],
  pyq: ["Details", "Papers", "Settings", "Preview", "Review", "Publish"],
  source: ["Details", "Book", "Topics", "Preferences", "Subtopics", "Review", "Publish"],
};

export function WorkspaceShell({
  header,
  left,
  right,
  footer,
}: {
  header?: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:h-full lg:min-h-0 rounded-2xl border border-white/10 bg-[#070708] lg:overflow-hidden">
      <section className="flex-1 min-w-0 flex flex-col lg:min-h-0">
        {header && <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/5">{header}</div>}
        <div className="flex-1 lg:overflow-y-auto custom-scrollbar px-5 py-5">{left}</div>
        {footer && (
          <div className="shrink-0 sticky bottom-0 lg:static z-30 border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </section>
      <aside className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0a0a0c] lg:overflow-y-auto custom-scrollbar p-4">
        {right}
      </aside>
    </div>
  );
}

export function WizardHeader({
  mode,
  currentStep,
  onChangeMode,
}: {
  mode: CreationMode;
  currentStep: number;
  onChangeMode?: () => void;
}) {
  const modeInfo = MODES.find((m) => m.id === mode)!;
  const Icon = modeInfo.icon;
  const steps = STEPS[mode];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Icon className="h-4 w-4 text-orange-400" />
          {modeInfo.label}
        </div>
        {onChangeMode && (
          <button onClick={onChangeMode} className="text-xs font-semibold text-gray-400 hover:text-orange-300 transition-colors">
            Change mode
          </button>
        )}
      </div>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {steps.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  active && "border-orange-500/60 bg-orange-500/10 text-orange-300",
                  done && "border-white/15 bg-white/5 text-gray-300",
                  !active && !done && "border-white/5 text-gray-500"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
                {label}
              </span>
              {i < steps.length - 1 && <span className="h-px w-3 bg-white/10" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ModePicker({ selected, onSelect }: { selected: CreationMode | null; onSelect: (mode: CreationMode) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white">How do you want to build this exam?</h3>
        <p className="text-xs text-gray-400 mt-0.5">You can change this until questions are created.</p>
      </div>
      {MODES.map((m) => {
        const Icon = m.icon;
        const isSelected = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={!m.available}
            onClick={() => onSelect(m.id)}
            className={cn(
              "w-full text-left rounded-xl border p-4 transition-all",
              isSelected
                ? "border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30"
                : "border-white/10 bg-[#0f0f11] hover:border-orange-500/40 hover:bg-[#15151a]",
              !m.available && "opacity-50 cursor-not-allowed hover:border-white/10 hover:bg-[#0f0f11]"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                <Icon className="h-4 w-4 text-orange-400" />
                {m.label}
              </span>
              {!m.available && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                  Coming soon
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{m.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function StatTile({ label, value, tone = "text-white" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="p-3 rounded-xl bg-[#14151f] border border-white/5 text-center space-y-1">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
      <span className={cn("text-lg font-extrabold tabular-nums", tone)}>{value}</span>
    </div>
  );
}
