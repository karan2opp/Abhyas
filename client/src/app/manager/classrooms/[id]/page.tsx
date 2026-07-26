"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, RefreshCw, Ban, UserPlus, Mail, Trash2, Users, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  getOrganisationClassroomsService,
  getClassroomRosterService,
  getClassroomTeachersService,
  addTeacherService,
  removeTeacherService,
  regenerateJoinCodeService,
  revokeJoinCodeService,
  inviteStudentService,
} from "../classroom.service";

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

  const loadAll = async () => {
    setLoading(true);
    try {
      const [classroomsRes, rosterRes, teachersRes] = await Promise.all([
        getOrganisationClassroomsService(),
        getClassroomRosterService(classroomId),
        getClassroomTeachersService(classroomId),
      ]);

      const found = (classroomsRes.data || []).find((c: Classroom) => c.id === classroomId);
      setClassroom(found || null);
      setRoster(rosterRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (err) {
      toast.error("Failed to load classroom");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) loadAll();
  }, [classroomId]);

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
      loadAll();
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
      loadAll();
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
      loadAll();
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
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove teacher");
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

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">{classroom.name}</h2>
        <p className="text-gray-400 mt-1">Manage join code, roster, and co-teachers.</p>
      </div>

      <Tabs defaultValue="joincode">
        <TabsList variant="line" className="mb-6 border-b border-white/5 w-full justify-start bg-transparent">
          <TabsTrigger value="joincode">Join Code</TabsTrigger>
          <TabsTrigger value="roster">Roster ({roster.length})</TabsTrigger>
          <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
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
                  <p>Expires: {new Date(classroom.joinCodeExpiresAt).toLocaleString()}</p>
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
          {roster.length === 0 ? (
            <Card className="bg-[#111520]/50 border-white/5 py-16 text-center">
              <CardContent className="flex flex-col items-center">
                <Users className="h-10 w-10 text-gray-500 mb-3" />
                <p className="text-gray-400">No students have joined yet.</p>
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
                    <span className="text-gray-500 text-xs">Joined {new Date(s.enrolledAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
