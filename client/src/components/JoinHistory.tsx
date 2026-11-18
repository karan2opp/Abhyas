"use client";

import React, { useEffect, useState } from "react";
import { History } from "lucide-react";
import api from "@/utils/axios";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date";

export type JoinRecord = {
  studentId: string;
  name: string;
  email: string;
  code: string | null;
  via: "code" | "invite" | null;
  status: "active" | "left";
  joinedAt: string;
  classroomId?: string;
  classroomName?: string;
  organisationName?: string | null;
};

export const getClassroomJoinsService = async (classroomId: string): Promise<JoinRecord[]> => {
  const res = await api.get(`/classrooms/${classroomId}/joins`);
  return res.data.data;
};

export const getAllJoinsService = async (search?: string): Promise<JoinRecord[]> => {
  const res = await api.get("/classrooms/all-joins", { params: search ? { search } : {} });
  return res.data.data;
};

/** One row per student: who joined, with which code, and when. Rows from before this was recorded show a dash for the code. */
export function JoinRows({ rows, showClassroom }: { rows: JoinRecord[]; showClassroom?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500 py-4">No students have joined yet.</p>;
  return (
    <div className="divide-y divide-white/5">
      {rows.map((r) => (
        <div key={`${r.studentId}-${r.joinedAt}-${r.classroomId ?? ""}`} className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{r.name}</p>
            <p className="text-xs text-gray-400 truncate">{r.email}</p>
            {showClassroom && (
              <p className="text-xs text-gray-500 truncate">{r.classroomName}{r.organisationName ? ` · ${r.organisationName}` : ""}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span className="font-mono tracking-widest text-emerald-400">{r.code ?? "—"}</span>
            <span>{r.via === "invite" ? "Email invite" : r.via === "code" ? "Shared code" : "—"}</span>
            <span>{formatDateTime(r.joinedAt)}</span>
            {r.status === "left" && <span className="text-red-400">Left</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** For a teacher or manager: who joined this classroom, and with which code. */
export default function JoinHistory({ classroomId }: { classroomId: string }) {
  const [rows, setRows] = useState<JoinRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getClassroomJoinsService(classroomId).then(setRows).catch(() => setFailed(true));
  }, [classroomId]);

  return (
    <Card className="bg-[#0f0f11] border-white/5">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
          <History className="h-4 w-4" /> Who joined with which code
        </div>
        {failed ? (
          <p className="text-sm text-red-400 py-2">Could not load the join history.</p>
        ) : rows === null ? (
          <p className="text-sm text-gray-500 py-2">Loading...</p>
        ) : (
          <JoinRows rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}
