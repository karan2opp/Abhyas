"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AssignmentDetails = {
  title: string;
  instructions: string[];
  startDate: string;
  dueDate: string;
  groupId: string;
};

export const EMPTY_ASSIGNMENT_DETAILS: AssignmentDetails = {
  title: "",
  instructions: [""],
  startDate: "",
  dueDate: "",
  groupId: "",
};

const inputClass = "bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-500 h-11 rounded-lg focus-visible:ring-orange-500/40";
const labelClass = "text-sm font-semibold text-gray-300";

export function AssignmentDetailsForm({
  values,
  onChange,
  classrooms,
  selectedClassroomId,
  groups,
}: {
  values: AssignmentDetails;
  onChange: (patch: Partial<AssignmentDetails>) => void;
  classrooms: { id: string; name: string }[];
  selectedClassroomId: string;
  groups: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white">Assignment Details</h2>
        <p className="text-xs text-gray-400 mt-0.5">Basic information students will see when completing this assignment.</p>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Assignment Title</label>
        <Input
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Data Structures & Algorithms - Homework 1"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className={labelClass}>Classroom</label>
          <select
            value={selectedClassroomId}
            disabled
            className="w-full bg-[#050505]/50 border border-white/5 text-gray-400 h-11 rounded-lg px-3 text-sm cursor-not-allowed"
          >
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Classroom members can access this assignment.</p>
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
          <p className="text-xs text-gray-500">Restrict to a specific group instead of the whole class.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className={labelClass}>Unlock Date / Start Date (optional)</label>
          <Input
            type="datetime-local"
            value={values.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className={cn(inputClass, "[color-scheme:dark]")}
          />
          <p className="text-xs text-gray-500">Students can open and work on this assignment starting from this time.</p>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Due Date / Deadline (optional)</label>
          <Input
            type="datetime-local"
            value={values.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className={cn(inputClass, "[color-scheme:dark]")}
          />
          <p className="text-xs text-gray-500">Students must submit before this deadline. No countdown timer required.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Instructions & Guidance</label>
        <div className="space-y-2.5">
          {values.instructions.map((inst, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={inst}
                onChange={(e) =>
                  onChange({
                    instructions: values.instructions.map((v, i) => (i === idx ? e.target.value : v)),
                  })
                }
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
    </div>
  );
}
