"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAllJoinsService, JoinRows, type JoinRecord } from "@/components/JoinHistory";

export default function SystemAdminJoinsPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<JoinRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      getAllJoinsService(search.trim() || undefined).then((r) => { setRows(r); setFailed(false); }).catch(() => setFailed(true));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  return (
    <div className="p-4 sm:p-6 md:p-10 h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Classroom joins</h2>
      <p className="text-gray-400 mt-1 mb-6">Which student joined which classroom, with which code. Latest 500.</p>

      <div className="relative w-full max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
        <input
          type="text"
          placeholder="Search by student, email, classroom or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-white placeholder:text-zinc-500 h-11 text-sm pl-10 border-b rounded-none border-0 border-white/20 bg-transparent px-0 focus:border-orange-500 focus:outline-none focus:ring-0"
        />
      </div>

      <Card className="bg-[#0f0f11] border-white/5">
        <CardContent>
          {failed ? <p className="text-sm text-red-400 py-2">Could not load the joins.</p> : rows === null ? <p className="text-sm text-gray-500 py-2">Loading...</p> : <JoinRows rows={rows} showClassroom />}
        </CardContent>
      </Card>
    </div>
  );
}
