"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/display/card";
import { getAllJoinsService, PagedJoinRows } from "@/components/classroom/JoinHistory";

export default function SystemAdminJoinsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Waits a moment after typing stops, so a request is not sent for every key.
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const load = useCallback((page: number) => getAllJoinsService(page, debouncedSearch || undefined), [debouncedSearch]);

  return (
    <div className="p-4 sm:p-6 md:p-10 h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Classroom joins</h2>
      <p className="text-gray-400 mt-1 mb-6">Which student joined which classroom, with which code. Newest first.</p>

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
          {/* A new search is a new list, so it starts again from the first page. */}
          <PagedJoinRows key={debouncedSearch} load={load} showClassroom removable />
        </CardContent>
      </Card>
    </div>
  );
}
