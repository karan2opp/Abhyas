"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Search, Users, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { getClassroomTeachersService, addTeacherService, removeTeacherService } from "../../classroom.service";

interface TeacherEntry {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export default function TeachersPage() {
  const params = useParams();
  const classroomId = params.id as string;

  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadTeachers = async (search: string) => {
    try {
      const res = await getClassroomTeachersService(classroomId, search || undefined);
      setTeachers(res.data || []);
    } catch (err) {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) loadTeachers(debouncedSearch);
  }, [classroomId, debouncedSearch]);

  const handleAddTeacher = async () => {
    if (!teacherEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setAddingTeacher(true);
    try {
      await addTeacherService(classroomId, teacherEmail.trim());
      toast.success("Teacher added");
      setTeacherEmail("");
      loadTeachers(debouncedSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add teacher");
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!confirm("Remove this teacher from the classroom?")) return;
    try {
      await removeTeacherService(classroomId, teacherId);
      toast.success("Teacher removed");
      loadTeachers(debouncedSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove teacher");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-6">
        <h3 className="text-2xl font-bold text-white">Teachers</h3>
        <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">{teachers.length}</span>
      </div>

      {/* ── Teachers list / Add co-teacher — side by side ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-white font-semibold text-base mb-3">Co-Teachers on this Classroom</h4>
          <div className="relative w-full max-w-md mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
            <input
              type="text"
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-white/30 h-11 rounded-xl text-sm transition-all shadow-inner pl-10"
            />
          </div>

          {loading ? (
            <div className="text-gray-400 text-center py-6 text-sm">Loading...</div>
          ) : teachers.length === 0 ? (
            <Card className="bg-[#0f0f11] border-white/5">
              <CardContent className="py-14 flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-white font-semibold text-base">
                  {debouncedSearch ? `No teachers matching "${debouncedSearch}"` : "No co-teachers yet."}
                </p>
                {!debouncedSearch && (
                  <p className="text-gray-500 text-sm mt-1">Add a co-teacher to help manage this classroom.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {teachers.map((t) => (
                <Card key={t.id} className="bg-[#0f0f11] border-white/5">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={t.name} avatarUrl={t.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-base truncate">{t.name}</p>
                        <p className="text-gray-500 text-sm truncate">{t.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 shrink-0"
                      onClick={() => handleRemoveTeacher(t.id)}
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-white font-semibold text-base mb-3">Add a Co-Teacher</h4>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="teacher@email.com"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTeacher()}
              className="flex-1 bg-[#0f0f11] border border-white/10 text-white placeholder:text-gray-500 rounded-lg px-4 py-2.5 focus:outline-none focus:border-white/20 transition-all text-sm"
            />
            <Button className="bg-orange-600 hover:bg-orange-700 text-white shrink-0" onClick={handleAddTeacher} disabled={addingTeacher}>
              {addingTeacher ? "Adding..." : "Add"}
            </Button>
          </div>

          <Card className="bg-[#0f0f11] border-white/5">
            <CardContent className="py-14 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-white font-semibold text-base">Invite a teacher</p>
              <p className="text-gray-500 text-sm mt-1">
                Enter an email above to add a co-teacher. They'll get full access to the roster, groups, assignments, and exams.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
