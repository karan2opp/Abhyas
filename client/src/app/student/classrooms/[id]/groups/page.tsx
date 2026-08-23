"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getMyGroupsService } from "../../../classrooms/group.service";

interface GroupEntry {
  id: string;
  name: string;
}

export default function StudentClassroomGroupsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getMyGroupsService(classroomId);
        setGroups(res.data || []);
      } catch {
        toast.error("Failed to load groups");
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId]);

  if (loading) return <div className="text-gray-400 text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Groups ({groups.length})</h2>
        <p className="text-gray-400 text-base mt-1">Groups you belong to in this classroom.</p>
      </div>

      {groups.length === 0 ? (
        <Card className="bg-[#0f0f11] border-white/5 py-10 text-center">
          <CardContent>
            <Users className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">You're not part of any group in this classroom yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Card
              key={g.id}
              onClick={() => router.push(`/student/classrooms/${classroomId}/groups/${g.id}`)}
              className="bg-[#0f0f11] border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="h-9 w-9 bg-orange-600/20 text-orange-400 rounded-lg flex items-center justify-center border border-orange-500/30 mb-3">
                  <Users className="h-4 w-4" />
                </div>
                <p className="text-white font-semibold text-base truncate">{g.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
