import React from "react";
import { formatDateTime } from "@/lib/date";

/** The details under an exam's title, one labelled row each: start, end (only if the teacher set them) and marks. */
export function ExamSchedule({ startTime, endTime, totalMarks }: { startTime: string | null; endTime: string | null; totalMarks: number }) {
  const rows = [
    startTime && { label: "Start", value: formatDateTime(startTime) },
    endTime && { label: "End", value: formatDateTime(endTime) },
    { label: "Marks", value: String(totalMarks) },
  ].filter((row): row is { label: string; value: string } => !!row);

  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
      {rows.map((row) => (
        <React.Fragment key={row.label}>
          <dt className="text-gray-500">{row.label}</dt>
          <dd className="text-gray-300 font-medium">{row.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
