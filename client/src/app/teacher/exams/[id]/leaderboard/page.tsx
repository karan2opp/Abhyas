"use client";

import { useParams } from "next/navigation";
import { LeaderboardView } from "@/components/LeaderboardView";

export default function TeacherLeaderboardPage() {
  const params = useParams();
  const examId = params.id as string;

  return (
    <LeaderboardView
      examId={examId}
    />
  );
}
