"use client";

import React, { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type ExamDetails = {
  title: string;
  type: "SCHEDULED" | "ON_DEMAND";
  duration: string;
  startTime: string;
  endTime: string;
  instructions: string[];
  requireFeedback: boolean;
  allowCoTeacherEdit: boolean;
  groupId: string;
};

export const EMPTY_EXAM_DETAILS: ExamDetails = {
  title: "",
  type: "SCHEDULED",
  duration: "60",
  startTime: "",
  endTime: "",
  instructions: [""],
  requireFeedback: false,
  allowCoTeacherEdit: false,
  groupId: "",
};

export function scheduledDurationMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const diff = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
  return diff > 0 ? diff : 0;
}

const inputClass = "bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-500 h-11 rounded-lg focus-visible:ring-orange-500/40";
const labelClass = "text-sm font-semibold text-gray-300";

export function ExamDetailsForm({
  values,
  onChange,
  classrooms,
  selectedClassroomId,
  groups,
}: {
  values: ExamDetails;
  onChange: (patch: Partial<ExamDetails>) => void;
  classrooms: { id: string; name: string }[];
  selectedClassroomId: string;
  groups: { id: string; name: string }[];
}) {
  const calculatedDuration = useMemo(() => scheduledDurationMinutes(values.startTime, values.endTime), [values.startTime, values.endTime]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white">Exam details</h2>
        <p className="text-xs text-gray-400 mt-0.5">Basic information students will see.</p>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Exam Title</label>
        <Input value={values.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Advanced Fluid Dynamics - Midterm" className={inputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className={labelClass}>Classroom</label>
          <select value={selectedClassroomId} disabled className="w-full bg-[#050505]/50 border border-white/5 text-gray-400 h-11 rounded-lg px-3 text-sm cursor-not-allowed">
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Lets classroom members start directly, no code needed.</p>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Group (optional)</label>
          <select
            value={values.groupId}
            onChange={(e) => onChange({ groupId: e.target.value })}
            disabled={!selectedClassroomId}
            className="w-full bg-[#14151f] border border-white/15 text-white h-11 rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 disabled:opacity-50"
          >
            <option value="">Class-wide (all students)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Restrict to one group instead of the whole classroom.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Exam Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ["SCHEDULED", "Scheduled (Fixed Time)"],
              ["ON_DEMAND", "On-Demand (Flexible)"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              onClick={() => onChange({ type: value })}
              className={cn(
                "h-11 border-2 font-bold text-sm rounded-xl flex items-center justify-center gap-2.5",
                values.type === value
                  ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-400 ring-2 ring-orange-500/30"
                  : "bg-[#14151f] border-white/15 text-zinc-400 hover:bg-[#1a1b2a] hover:text-white"
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full", values.type === value ? "bg-white" : "bg-zinc-600")} />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className={labelClass}>{values.type === "SCHEDULED" ? "Start Time" : "Window Start"}</label>
          <Input type="datetime-local" value={values.startTime} onChange={(e) => onChange({ startTime: e.target.value })} className={cn(inputClass, "[color-scheme:dark]")} />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>{values.type === "SCHEDULED" ? "End Time" : "Window End"}</label>
          <Input type="datetime-local" value={values.endTime} onChange={(e) => onChange({ endTime: e.target.value })} className={cn(inputClass, "[color-scheme:dark]")} />
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Duration (Minutes)</label>
        {values.type === "SCHEDULED" ? (
          <Input value={calculatedDuration} readOnly className="bg-[#14151f]/50 border border-white/10 text-gray-400 h-11 rounded-lg cursor-not-allowed" />
        ) : (
          <Input type="number" value={values.duration} onChange={(e) => onChange({ duration: e.target.value })} placeholder="60" className={inputClass} />
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Exam Instructions</label>
        <div className="space-y-2.5">
          {values.instructions.map((inst, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={inst}
                onChange={(e) => onChange({ instructions: values.instructions.map((v, i) => (i === idx ? e.target.value : v)) })}
                placeholder={`Instruction ${idx + 1}`}
                className={cn(inputClass, "h-10 flex-1")}
              />
              {values.instructions.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Remove instruction"
                  onClick={() => onChange({ instructions: values.instructions.filter((_, i) => i !== idx) })}
                  className="bg-transparent border-white/10 text-red-400 hover:bg-red-500/10 h-10 w-10 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => onChange({ instructions: [...values.instructions, ""] })}
            className="w-full bg-transparent border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Instruction
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-[#050505] border border-white/10 rounded-lg">
        <div className="space-y-0.5">
          <label className={labelClass}>Require Feedback Form</label>
          <p className="text-xs text-gray-500">Ask students for feedback after they submit the exam.</p>
        </div>
        <Switch checked={values.requireFeedback} onCheckedChange={(v) => onChange({ requireFeedback: v })} />
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-[#050505] border border-white/10 rounded-lg">
        <div className="space-y-0.5">
          <label className={labelClass}>Allow Co-Teacher Editing</label>
          <p className="text-xs text-gray-500">Let co-teachers of this classroom edit this exam&apos;s questions and content.</p>
        </div>
        <Switch checked={values.allowCoTeacherEdit} onCheckedChange={(v) => onChange({ allowCoTeacherEdit: v })} />
      </div>
    </div>
  );
}
