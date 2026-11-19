"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/controls/button";

export type ExamActionExam = {
  startTime: string | null;
  joinCode?: string;
  mySubmission?: { id: string; status: string } | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// The one button on an exam in a student's list: see the result, carry on, wait for the start (the countdown screen), or start.
// An exam with a start time still ahead can't be started, whatever its kind, so it opens the countdown instead.
export function ExamActionButton({ exam, starting, onStart }: { exam: ExamActionExam; starting: boolean; onStart: () => void }) {
  const router = useRouter();
  const submission = exam.mySubmission;

  // The list is not redrawn when the start time arrives, so wait for it here and redraw this button then ("Not Started
  // Yet" turns into "Start Exam" without a refresh). Only a start within a day is waited for.
  const startMs = exam.startTime ? new Date(exam.startTime).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startMs === null) return;
    const wait = startMs - Date.now();
    if (wait <= 0) {
      setNow(Date.now());
      return;
    }
    if (wait > ONE_DAY_MS) return;
    const timer = setTimeout(() => setNow(Date.now()), wait + 250);
    return () => clearTimeout(timer);
  }, [startMs]);

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
  if (startMs !== null && startMs > now) {
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
