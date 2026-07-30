"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, RefreshCw, Ban, UserPlus, Mail, Trash2, Users, KeyRound, Pencil, Check, X, Search, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  getOrganisationClassroomsService,
  updateClassroomService,
  deleteClassroomService,
  getClassroomRosterService,
  getClassroomTeachersService,
  addTeacherService,
  removeTeacherService,
  regenerateJoinCodeService,
  revokeJoinCodeService,
  inviteStudentService,
} from "../classroom.service";
import { listGroupsService } from "../group.service";
import { listExamsForClassroomService, deleteExamService } from "../exam.service";
import { formatDate, formatDateTime } from "@/lib/date";

interface Classroom {
  id: string;
  name: string;
  joinCode: string;
  joinCodeExpiresAt: string;
  joinCodeMaxUses: number;
  joinCodeUseCount: number;
  joinCodeRevoked: boolean;
}

interface RosterEntry {
  studentId: string;
  name: string;
  email: string;
  status: string;
  enrolledAt: string;
}

interface TeacherEntry {
  id: string;
  name: string;
  email: string;
}

interface GroupEntry {
  id: string;
  name: string;
}

interface ExamEntry {
  id: string;
  title: string;
  type: "SCHEDULED" | "ON_DEMAND";
  totalMarks: number;
  groupId: string | null;
  startTime: string | null;
  duration: number;
}

export default function ManagerClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [debouncedTeacherSearch, setDebouncedTeacherSearch] = useState("");

  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedStudentSearch(studentSearchQuery), 400);
    return () => clearTimeout(handler);
  }, [studentSearchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedTeacherSearch(teacherSearchQuery), 400);
    return () => clearTimeout(handler);
  }, [teacherSearchQuery]);

  const loadClassroom = async () => {
    try {
      const classroomsRes = await getOrganisationClassroomsService();
      const found = (classroomsRes.data || []).find((c: Classroom) => c.id === classroomId);
      setClassroom(found || null);
    } catch (err) {
      toast.error("Failed to load classroom");
    }
  };

  const loadRoster = async (search: string) => {
    try {
      const rosterRes = await getClassroomRosterService(classroomId, search || undefined);
      setRoster(rosterRes.data || []);
    } catch (err) {
      toast.error("Failed to load roster");
    }
  };

  const loadTeachers = async (search: string) => {
    try {
      const teachersRes = await getClassroomTeachersService(classroomId, search || undefined);
      setTeachers(teachersRes.data || []);
    } catch (err) {
      toast.error("Failed to load teachers");
    }
  };

  const loadGroups = async () => {
    try {
      const res = await listGroupsService(classroomId);
      setGroups(res.data || []);
    } catch (err) {
      toast.error("Failed to load groups");
    }
  };

  const loadExams = async () => {
    try {
      const res = await listExamsForClassroomService(classroomId);
      setExams(res.data || []);
    } catch (err) {
      toast.error("Failed to load exams");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadClassroom(), loadRoster(debouncedStudentSearch), loadTeachers(debouncedTeacherSearch), loadGroups(), loadExams()]);
    setLoading(false);
  };

  useEffect(() => {
    if (classroomId) loadAll();
  }, [classroomId]);

  useEffect(() => {
    if (classroomId && !loading) loadRoster(debouncedStudentSearch);
  }, [debouncedStudentSearch]);

  useEffect(() => {
    if (classroomId && !loading) loadTeachers(debouncedTeacherSearch);
  }, [debouncedTeacherSearch]);

  const handleCopyCode = () => {
    if (!classroom) return;
    navigator.clipboard.writeText(classroom.joinCode);
    toast.success("Join code copied");
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateJoinCodeService(classroomId);
      toast.success("Join code regenerated");
      loadClassroom();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to regenerate join code");
    } finally {
      setRegenerating(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Revoke this join code? Students won't be able to use it to join anymore.")) return;
    setRevoking(true);
    try {
      await revokeJoinCodeService(classroomId);
      toast.success("Join code revoked");
      loadClassroom();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke join code");
    } finally {
      setRevoking(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      await inviteStudentService(classroomId, inviteEmail.trim());
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

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
      loadTeachers(debouncedTeacherSearch);
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
      loadTeachers(debouncedTeacherSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove teacher");
    }
  };

  const handleStartEditName = () => {
    setNameInput(classroom!.name);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (nameInput.trim().length < 2) {
      toast.error("Classroom name must be at least 2 characters");
      return;
    }
    setSavingName(true);
    try {
      await updateClassroomService(classroomId, { name: nameInput.trim() });
      toast.success("Classroom renamed");
      setEditingName(false);
      loadClassroom();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to rename classroom");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!confirm(`Delete exam "${title}"? This permanently deletes its sections, questions, and submissions. This cannot be undone.`)) return;
    try {
      await deleteExamService(examId);
      toast.success("Exam deleted");
      loadExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete exam");
    }
  };

  const handleDeleteClassroom = async () => {
    if (!confirm(
      `Delete "${classroom!.name}"? This permanently deletes its roster, co-teachers, invites, groups, exams, and assignments. This cannot be undone.`
    )) return;

    setDeleting(true);
    try {
      await deleteClassroomService(classroomId);
      toast.success("Classroom deleted");
      router.push("/manager/classrooms");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete classroom");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading classroom...</div>;
  if (!classroom) return <div className="p-10 text-white text-center">Classroom not found</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <button
        onClick={() => router.push("/manager/classrooms")}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Classrooms
      </button>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="bg-[#09090b] border border-white/10 rounded-lg px-3 py-1.5 text-2xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
              />
              <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleSaveName} disabled={savingName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white shrink-0" onClick={() => setEditingName(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold text-white tracking-tight truncate">{classroom.name}</h2>
              <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white shrink-0" onClick={handleStartEditName} title="Rename classroom">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-gray-400 mt-1">Manage join code, roster, and co-teachers.</p>
        </div>

        <Button variant="destructive" className="shrink-0" onClick={handleDeleteClassroom} disabled={deleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? "Deleting..." : "Delete Classroom"}
        </Button>
      </div>

      <Tabs defaultValue="joincode">
        <TabsList variant="line" className="mb-6 border-b border-white/5 w-full justify-start bg-transparent">
          <TabsTrigger value="joincode">Join Code</TabsTrigger>
          <TabsTrigger value="roster">Roster ({roster.length})</TabsTrigger>
          <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
          <TabsTrigger value="exams">Exams ({exams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="joincode">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-[#111520] border-white/5">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
                  <KeyRound className="h-4 w-4" /> Shared Join Code
                </div>

                {classroom.joinCodeRevoked ? (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    This code has been revoked.
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-[#09090b] border border-white/10 rounded-lg font-mono text-lg text-emerald-400 tracking-widest text-center">
                      {classroom.joinCode}
                    </div>
                    <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Expires: {formatDateTime(classroom.joinCodeExpiresAt)}</p>
                  <p>Uses: {classroom.joinCodeUseCount} / {classroom.joinCodeMaxUses}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {regenerating ? "Regenerating..." : "Regenerate"}
                  </Button>
                  {!classroom.joinCodeRevoked && (
                    <Button variant="destructive" className="flex-1" onClick={handleRevoke} disabled={revoking}>
                      <Ban className="mr-2 h-4 w-4" />
                      {revoking ? "Revoking..." : "Revoke"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111520] border-white/5">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
                  <Mail className="h-4 w-4" /> Invite a Student by Email
                </div>
                <p className="text-xs text-gray-500">
                  Sends a single-use code tied to that email — only that student can redeem it.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="student@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
                  />
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleInvite} disabled={inviting}>
                    {inviting ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roster">
          <div className="flex flex-col gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full bg-[#111520] border border-white/10 text-white placeholder:text-gray-500 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-white/20 transition-all text-sm"
              />
            </div>

            {roster.length === 0 ? (
              <Card className="bg-[#111520]/50 border-white/5 py-16 text-center">
                <CardContent className="flex flex-col items-center">
                  <Users className="h-10 w-10 text-gray-500 mb-3" />
                  <p className="text-gray-400">
                    {debouncedStudentSearch ? `No students matching "${debouncedStudentSearch}".` : "No students have joined yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {roster.map((s) => (
                  <div key={s.studentId} className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl">
                    <div>
                      <p className="text-white font-semibold text-sm">{s.name}</p>
                      <p className="text-gray-500 text-xs">{s.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-500/10 text-gray-400 border border-gray-500/20"}`}>
                        {s.status}
                      </span>
                      <span className="text-gray-500 text-xs">Joined {formatDate(s.enrolledAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="teachers">
          <Card className="bg-[#111520] border-white/5 mb-4">
            <CardContent>
              <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold mb-3">
                <UserPlus className="h-4 w-4" /> Add a Co-Teacher
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="teacher@email.com"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTeacher()}
                  className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
                />
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleAddTeacher} disabled={addingTeacher}>
                  {addingTeacher ? "Adding..." : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="relative w-full sm:w-72 mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search teachers by name or email..."
              value={teacherSearchQuery}
              onChange={(e) => setTeacherSearchQuery(e.target.value)}
              className="w-full bg-[#111520] border border-white/10 text-white placeholder:text-gray-500 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-white/20 transition-all text-sm"
            />
          </div>

          {teachers.length === 0 ? (
            <Card className="bg-[#111520] border-white/5 py-10 text-center">
              <CardContent>
                <Users className="h-8 w-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">
                  {debouncedTeacherSearch ? `No teachers matching "${debouncedTeacherSearch}".` : "No co-teachers yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl">
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.email}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    onClick={() => handleRemoveTeacher(t.id)}
                    title="Remove teacher"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exams">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Exams can be class-wide or restricted to a group.</p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push(`/teacher/exams/new?classroomId=${classroomId}`)}
              >
                <Plus className="mr-2 h-4 w-4" /> New Exam
              </Button>
            </div>

            {groups.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Or create for a specific group:</span>
                {groups.map((g) => (
                  <Button
                    key={g.id}
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-white/10 text-white hover:bg-white/5"
                    onClick={() => router.push(`/teacher/exams/new?classroomId=${classroomId}&groupId=${g.id}`)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> {g.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {exams.length === 0 ? (
            <Card className="bg-[#111520] border-white/5 py-10 text-center">
              <CardContent>
                <FileText className="h-8 w-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No exams yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {exams.map((e) => {
                const groupName = groups.find((g) => g.id === e.groupId)?.name;
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl hover:bg-[#1a1f2e] hover:border-white/10 transition-all"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => router.push(`/teacher/exams/${e.id}`)}
                    >
                      <div className="h-9 w-9 bg-yellow-600/20 text-yellow-400 rounded-lg flex items-center justify-center border border-yellow-500/20 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{e.title}</p>
                        <p className="text-gray-500 text-xs">
                          {groupName ? `Group: ${groupName}` : "Class-wide"} · {e.totalMarks} marks · {e.duration}min
                          {e.type === "SCHEDULED" && e.startTime && ` · Starts ${formatDateTime(e.startTime)}`}
                          {e.type === "ON_DEMAND" && " · On-demand"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent border-white/10 text-white hover:bg-white/5"
                        onClick={() => router.push(`/teacher/exams/${e.id}/results`)}
                      >
                        Results
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={() => handleDeleteExam(e.id, e.title)}
                        title="Delete exam"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
