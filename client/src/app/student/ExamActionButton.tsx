"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/controls/button";

export type ExamActionExam = {
  startTime: string | null;
  joinCode?: string;
  mySubmission?: { id: string; status: string } | null;
};

// The one button on an exam in a student's list: see the result, carry on, wait for the start (the countdown screen), or start.
// An exam with a start time still ahead can't be started, whatever its kind, so it opens the countdown instead.
export function ExamActionButton({ exam, starting, onStart }: { exam: ExamActionExam; starting: boolean; onStart: () => void }) {
  const router = useRouter();
  const submission = exam.mySubmission;

  if (submission?.status === "submitted" || submission?.status === "evaluating") {
    return (
      <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white" onClick={() => router.push(`/student/results/${submission.id}`)}>
        View Result
      </Button>
    );
  }
  if (submission?.status === "inprogress") {
    return (
      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => router.push(`/student/exams/${submission.id}`)}>
        Resume
      </Button>
    );
  }
  if (exam.startTime && new Date(exam.startTime) > new Date()) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="bg-transparent border-white/10 text-gray-400 hover:text-white"
        onClick={() => exam.joinCode && router.push(`/student/waiting/${exam.joinCode}`)}
      >
        Not Started Yet
      </Button>
    );
  }
  return (
    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={onStart} disabled={starting}>
      {starting ? "Starting..." : "Start Exam"}
    </Button>
  );
}
