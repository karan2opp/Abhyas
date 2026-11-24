"use client";

import React, { useState } from "react";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/axios";
import { Button } from "@/components/ui/controls/button";

// Takes a student out of a classroom (a teacher of it, a manager of its organisation, or a system admin). Their past
// submissions and marks are kept; they lose access to the classroom, and can join again later with a code.
export const removeStudentService = async (classroomId: string, studentId: string) => {
  const res = await api.delete(`/classrooms/${classroomId}/students/${studentId}`);
  return res.data;
};

/** A "Remove" button that asks first, removes the student, and then calls `onRemoved` so the list can reload. */
export function RemoveStudentButton({
  classroomId,
  studentId,
  studentName,
  classroomName,
  onRemoved,
  className = "",
}: {
  classroomId: string;
  studentId: string;
  studentName: string;
  classroomName?: string;
  onRemoved: () => void;
  className?: string;
}) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    const where = classroomName ? `"${classroomName}"` : "this classroom";
    if (!confirm(`Remove ${studentName} from ${where}? They will lose access to its exams and assignments. Their past results are kept, and they can join again with a code.`)) return;
    setRemoving(true);
    try {
      await removeStudentService(classroomId, studentId);
      toast.success(`${studentName} was removed`);
      onRemoved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove student");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className={`bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 ${className}`}
      onClick={handleRemove}
      disabled={removing}
    >
      <UserMinus className="mr-1.5 h-3.5 w-3.5" />
      {removing ? "Removing..." : "Remove"}
    </Button>
  );
}
