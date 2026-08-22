"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layers, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createGroupService, listGroupsService } from "../../group.service";

interface GroupEntry {
  id: string;
  name: string;
  memberCount: number;
}

export default function GroupsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadGroups = async () => {
    try {
      const res = await listGroupsService(classroomId);
      setGroups(res.data || []);
    } catch (err) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) loadGroups();
  }, [classroomId]);

  const handleCreateGroup = async () => {
    if (newGroupName.trim().length < 2) {
      toast.error("Group name must be at least 2 characters");
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await createGroupService({ name: newGroupName.trim(), classroomId });
      toast.success("Group created");
      setGroupDialogOpen(false);
      setNewGroupName("");
      await loadGroups();
      router.push(`/teacher/classrooms/${classroomId}/groups/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Groups ({groups.length})</h3>
          <p className="text-gray-400 text-base mt-1">
            Groups filter students within this classroom — assign exams/assignments to a group instead of the whole class.
          </p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white shrink-0" onClick={() => setGroupDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-10">Loading groups...</div>
      ) : groups.length === 0 ? (
        <Card className="bg-[#0f0f11] border-white/5 py-10 text-center">
          <CardContent>
            <Users className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No groups yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Card
              key={g.id}
              onClick={() => router.push(`/teacher/classrooms/${classroomId}/groups/${g.id}`)}
              className="bg-[#0f0f11] border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="h-10 w-10 bg-orange-600/20 text-orange-400 rounded-lg flex items-center justify-center border border-orange-500/30 mb-3">
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-white font-semibold text-base truncate">{g.name}</p>
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> {g.memberCount} {g.memberCount === 1 ? "student" : "students"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Group Dialog ──────────────────────────────────────── */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-gray-300">Group Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Advanced Batch"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
            />
          </div>
          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleCreateGroup} disabled={creatingGroup}>
              {creatingGroup ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
