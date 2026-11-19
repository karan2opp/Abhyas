"use client";

import { useParams } from "next/navigation";
import { LeaderboardView } from "@/components/exam/LeaderboardView";

export default function TeacherLeaderboardPage() {
  const params = useParams();
  const examId = params.examId as string;

  return (
    <LeaderboardView
      examId={examId}
    />
  );
}
