"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Layers, ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMyGroupsService } from "../../../../classrooms/group.service";

interface GroupEntry {
  id: string;
  name: string;
}

export default function StudentGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getMyGroupsService(classroomId);
        const found = (res.data || []).find((g: GroupEntry) => g.id === groupId);
        setGroup(found || null);
      } catch (err) {
        toast.error("Failed to load group");
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId, groupId]);

  if (loading) return <div className="text-gray-400 text-center py-10">Loading...</div>;
  if (!group) return <div className="text-gray-400 text-center py-10">Group not found</div>;

  return (
    <div>
      <button
        onClick={() => router.push(`/student/classrooms/${classroomId}/groups`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Groups
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{group.name}</h2>
          <p className="text-gray-500 text-sm">Group in this classroom</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => router.push(`/student/classrooms/${classroomId}/groups/${groupId}/assignments`)}
        >
          <ClipboardList className="mr-2 h-4 w-4" /> Group Assignments
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="bg-transparent border-white/10 text-white hover:bg-white/5"
          onClick={() => router.push(`/student/classrooms/${classroomId}/groups/${groupId}/exams`)}
        >
          <FileText className="mr-2 h-4 w-4" /> Group Exams
        </Button>
      </div>
    </div>
  );
}
