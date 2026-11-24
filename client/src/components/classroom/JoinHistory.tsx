"use client";

import React, { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import api from "@/utils/axios";
import { Card, CardContent } from "@/components/ui/display/card";
import { Pagination } from "@/components/common/Pagination";
import { formatDateTime } from "@/lib/date";
import { RemoveStudentButton } from "./RemoveStudentButton";

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

// One page of joins, as the server sends every list.
export type JoinPage = { data: JoinRecord[]; total: number; page: number; limit: number; hasMore: boolean };

const JOIN_PAGE_SIZE = 10;

export const getClassroomJoinsService = async (classroomId: string, page: number): Promise<JoinPage> => {
  const res = await api.get(`/classrooms/${classroomId}/joins`, { params: { page, limit: JOIN_PAGE_SIZE } });
  return res.data.data;
};

export const getAllJoinsService = async (page: number, search?: string): Promise<JoinPage> => {
  const res = await api.get("/classrooms/all-joins", { params: { page, limit: JOIN_PAGE_SIZE, ...(search ? { search } : {}) } });
  return res.data.data;
};

/**
 * One row per student: who joined, with which code, and when. Rows from before this was recorded show a dash for the code.
 * With `onRemoved`, a student still in the classroom also gets a Remove button (the system admin's list of every join).
 */
export function JoinRows({ rows, showClassroom, onRemoved }: { rows: JoinRecord[]; showClassroom?: boolean; onRemoved?: () => void }) {
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
            {onRemoved && r.status === "active" && r.classroomId && (
              <RemoveStudentButton
                classroomId={r.classroomId}
                studentId={r.studentId}
                studentName={r.name}
                classroomName={r.classroomName}
                onRemoved={onRemoved}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The joins a `load` function returns, one page at a time, with the page buttons underneath. A new `load` (another
 * classroom, another search) means a different list, so the caller gives this a new `key` to start again from page 1.
 */
export function PagedJoinRows({ load, showClassroom, removable }: { load: (page: number) => Promise<JoinPage>; showClassroom?: boolean; removable?: boolean }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<JoinPage | null>(null);
  const [failed, setFailed] = useState(false);
  // Bumped after a student is removed, so the same page loads again and shows them as "Left".
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let current = true;
    load(page)
      .then((loaded) => {
        if (!current) return;
        setResult(loaded);
        setFailed(false);
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [load, page, reloads]);

  if (failed) return <p className="text-sm text-red-400 py-2">Could not load the join history.</p>;
  if (result === null) return <p className="text-sm text-gray-500 py-2">Loading...</p>;
  return (
    <>
      <JoinRows rows={result.data} showClassroom={showClassroom} onRemoved={removable ? () => setReloads((n) => n + 1) : undefined} />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(result.total / result.limit))} onPageChange={setPage} />
    </>
  );
}

/** For a teacher or manager: who joined this classroom, and with which code. */
export default function JoinHistory({ classroomId }: { classroomId: string }) {
  const load = useCallback((page: number) => getClassroomJoinsService(classroomId, page), [classroomId]);

  return (
    <Card className="bg-[#0f0f11] border-white/5">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
          <History className="h-4 w-4" /> Who joined with which code
        </div>
        <PagedJoinRows key={classroomId} load={load} />
      </CardContent>
    </Card>
  );
}
