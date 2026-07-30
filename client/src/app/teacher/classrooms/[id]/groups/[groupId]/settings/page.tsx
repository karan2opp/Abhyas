"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { listGroupsService, updateGroupService, deleteGroupService } from "../../../../group.service";

interface GroupEntry {
  id: string;
  name: string;
}

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadGroup = async () => {
    try {
      const res = await listGroupsService(classroomId);
      const found = (res.data || []).find((g: GroupEntry) => g.id === groupId);
      setGroup(found || null);
      if (found) setNameInput(found.name);
    } catch (err) {
      toast.error("Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) loadGroup();
  }, [groupId]);

  const handleSaveName = async () => {
    if (nameInput.trim().length < 2) {
      toast.error("Group name must be at least 2 characters");
      return;
    }
    setSavingName(true);
    try {
      await updateGroupService(groupId, { name: nameInput.trim() });
      toast.success("Group renamed");
      await loadGroup();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to rename group");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    if (!confirm(`Delete group "${group.name}"? This only removes the group filter — students stay enrolled in the classroom.`)) return;
    setDeleting(true);
    try {
      await deleteGroupService(groupId);
      toast.success("Group deleted");
      router.push(`/teacher/classrooms/${classroomId}/groups`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete group");
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-center py-10">Loading group...</div>;
  if (!group) return <div className="text-gray-400 text-center py-10">Group not found</div>;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push(`/teacher/classrooms/${classroomId}/groups/${groupId}`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Group
      </button>

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Group Settings</h3>
        <p className="text-gray-400 text-base mt-1">Update this group's name, or delete it entirely.</p>
      </div>

      <Card className="bg-[#111520] border-white/5 mb-6">
        <CardContent className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Group Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
            />
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0" onClick={handleSaveName} disabled={savingName}>
              {savingName ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#111520] border-red-500/20">
        <CardContent className="space-y-3">
          <div>
            <p className="text-base font-semibold text-red-400">Danger Zone</p>
            <p className="text-gray-400 text-sm mt-1">
              This only removes the group filter — students stay enrolled in the classroom. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" onClick={handleDeleteGroup} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete Group"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
