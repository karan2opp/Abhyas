"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { updateClassroomService, deleteClassroomService } from "../../classroom.service";
import { useClassroom } from "../ClassroomContext";

export default function ClassroomSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const { classroom, reloadClassroom } = useClassroom();

  const [nameInput, setNameInput] = useState(classroom.name);
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveName = async () => {
    if (nameInput.trim().length < 2) {
      toast.error("Classroom name must be at least 2 characters");
      return;
    }
    setSavingName(true);
    try {
      await updateClassroomService(classroomId, { name: nameInput.trim() });
      toast.success("Classroom renamed");
      await reloadClassroom();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to rename classroom");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!confirm(
      `Delete "${classroom.name}"? This permanently deletes its roster, co-teachers, invites, groups, exams, and assignments. This cannot be undone.`
    )) return;

    setDeleting(true);
    try {
      await deleteClassroomService(classroomId);
      toast.success("Classroom deleted");
      router.push("/teacher/classrooms");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete classroom");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Classroom Settings</h3>
        <p className="text-gray-400 text-base mt-1">Update the classroom's name, or delete it entirely.</p>
      </div>

      <Card className="bg-[#0f0f11] border-white/5 mb-6">
        <CardContent className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Classroom Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
            />
            <Button className="bg-orange-600 hover:bg-orange-700 text-white shrink-0" onClick={handleSaveName} disabled={savingName}>
              {savingName ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0f0f11] border-red-500/20">
        <CardContent className="space-y-3">
          <div>
            <p className="text-base font-semibold text-red-400">Danger Zone</p>
            <p className="text-gray-400 text-sm mt-1">
              Deleting this classroom permanently removes its roster, co-teachers, invites, groups, exams, and assignments. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" onClick={handleDeleteClassroom} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Classroom"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
