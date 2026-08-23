"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Settings, ClipboardList, FileText, Search, Users, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { getClassroomRosterService } from "../../../classroom.service";
import {
  listGroupsService,
  getGroupMembersService,
  addStudentToGroupService,
  removeStudentFromGroupService,
} from "../../../group.service";
import { listAssignmentsForClassroomService } from "../../../../assignments/assignment.service";
import { listExamsForClassroomService } from "../../../../exams/exam.service";

interface GroupEntry {
  id: string;
  name: string;
  memberCount: number;
}

interface GroupMemberEntry {
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  addedAt: string;
}

interface RosterEntry {
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [examCount, setExamCount] = useState(0);

  const [members, setMembers] = useState<GroupMemberEntry[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);

  const [rosterResults, setRosterResults] = useState<RosterEntry[]>([]);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [debouncedAddSearch, setDebouncedAddSearch] = useState("");
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  const loadGroup = async () => {
    try {
      const res = await listGroupsService(classroomId);
      const found = (res.data || []).find((g: GroupEntry) => g.id === groupId);
      setGroup(found || null);
    } catch {
      toast.error("Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [aRes, eRes] = await Promise.all([
        listAssignmentsForClassroomService(classroomId, { groupId }),
        listExamsForClassroomService(classroomId, groupId),
      ]);
      setAssignmentCount((aRes.data || []).length);
      setExamCount((eRes.data || []).length);
    } catch {
      // non-critical — stats bar just shows 0s
    }
  };

  const loadMembers = async (search: string) => {
    setMembersLoading(true);
    try {
      const res = await getGroupMembersService(groupId, search || undefined);
      setMembers(res.data || []);
    } catch {
      toast.error("Failed to load group members");
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadStats();
      loadMembers("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedMemberSearch(memberSearchQuery), 400);
    return () => clearTimeout(handler);
  }, [memberSearchQuery]);

  useEffect(() => {
    if (groupId) loadMembers(debouncedMemberSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMemberSearch]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedAddSearch(addSearchQuery), 400);
    return () => clearTimeout(handler);
  }, [addSearchQuery]);

  useEffect(() => {
    if (!debouncedAddSearch) {
      setRosterResults([]);
      return;
    }
    (async () => {
      setAddSearchLoading(true);
      try {
        const res = await getClassroomRosterService(classroomId, debouncedAddSearch);
        setRosterResults(res.data || []);
      } catch {
        toast.error("Failed to search roster");
      } finally {
        setAddSearchLoading(false);
      }
    })();
  }, [debouncedAddSearch, classroomId]);

  const handleAddStudent = async (studentId: string) => {
    setAddingStudentId(studentId);
    try {
      await addStudentToGroupService(groupId, studentId);
      toast.success("Student added");
      setRosterResults((prev) => prev.filter((s) => s.studentId !== studentId));
      loadMembers(debouncedMemberSearch);
      loadGroup();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add student");
    } finally {
      setAddingStudentId(null);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    setRemovingStudentId(studentId);
    try {
      await removeStudentFromGroupService(groupId, studentId);
      toast.success("Student removed");
      loadMembers(debouncedMemberSearch);
      loadGroup();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove student");
    } finally {
      setRemovingStudentId(null);
    }
  };

  const memberIds = new Set(members.map((m) => m.studentId));
  const addableResults = rosterResults.filter((s) => s.status === "active" && !memberIds.has(s.studentId));

  if (loading) return <div className="text-gray-400 text-center py-10">Loading group...</div>;
  if (!group) return <div className="text-gray-400 text-center py-10">Group not found</div>;

  return (
    <div>
      <button
        onClick={() => router.push(`/teacher/classrooms/${classroomId}/groups`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Groups
      </button>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-14 w-14 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">{group.name}</h2>
            <p className="text-gray-400 text-sm mt-0.5">Manage students, assignments, and exams for this group.</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex gap-2">
            <Button
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white text-base px-5"
              onClick={() => router.push(`/teacher/classrooms/${classroomId}/groups/${groupId}/assignments`)}
            >
              <ClipboardList className="mr-2 h-4 w-4" /> Group Assignments
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-white/10 text-white hover:bg-white/5 text-base px-5"
              onClick={() => router.push(`/teacher/classrooms/${classroomId}/groups/${groupId}/exams`)}
            >
              <FileText className="mr-2 h-4 w-4" /> Group Exams
            </Button>
          </div>
          <button
            onClick={() => router.push(`/teacher/classrooms/${classroomId}/groups/${groupId}/settings`)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-lg transition-colors"
          >
            <Settings className="h-3.5 w-3.5" /> Update Group Info
          </button>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <Card className="bg-[#0f0f11] border-white/5 mb-8">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
            <div className="p-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Students</p>
                <p className="text-2xl font-bold text-white leading-tight">{group.memberCount}</p>
                <p className="text-xs text-gray-500">In this group</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30 shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Assignments</p>
                <p className="text-2xl font-bold text-white leading-tight">{assignmentCount}</p>
                <p className="text-xs text-gray-500">Total assigned</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Exams</p>
                <p className="text-2xl font-bold text-white leading-tight">{examCount}</p>
                <p className="text-xs text-gray-500">Total created</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Students — both search bars in one row ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-white font-semibold text-base mb-3">Students in this Group</h4>
          <div className="relative w-full max-w-md mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-white/30 h-11 rounded-xl text-sm transition-all shadow-inner pl-10"
            />
          </div>

          {membersLoading ? (
            <div className="text-gray-400 text-center py-6 text-sm">Loading...</div>
          ) : members.length === 0 ? (
            <Card className="bg-[#0f0f11] border-white/5">
              <CardContent className="py-14 flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-white font-semibold text-base">
                  {debouncedMemberSearch ? `No students matching "${debouncedMemberSearch}"` : "No students in this group yet."}
                </p>
                {!debouncedMemberSearch && (
                  <p className="text-gray-500 text-sm mt-1">Add students from the roster to get started.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <Card key={m.studentId} className="bg-[#0f0f11] border-white/5">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={m.name} avatarUrl={m.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-base truncate">{m.name}</p>
                        <p className="text-gray-500 text-sm truncate">{m.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 shrink-0"
                      onClick={() => handleRemoveStudent(m.studentId)}
                      disabled={removingStudentId === m.studentId}
                    >
                      <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                      {removingStudentId === m.studentId ? "Removing..." : "Remove"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-white font-semibold text-base mb-3">Add Students from Roster</h4>
          <div className="relative w-full max-w-md mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={addSearchQuery}
              onChange={(e) => setAddSearchQuery(e.target.value)}
              className="w-full bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-white/30 h-11 rounded-xl text-sm transition-all shadow-inner pl-10"
            />
          </div>

          {!debouncedAddSearch ? (
            <Card className="bg-[#0f0f11] border-white/5">
              <CardContent className="py-14 flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <UserPlus className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-white font-semibold text-base">Search for students</p>
                <p className="text-gray-500 text-sm mt-1">Type a name or email above to find and add students from your roster.</p>
              </CardContent>
            </Card>
          ) : addSearchLoading ? (
            <div className="text-gray-400 text-center py-6 text-sm">Searching...</div>
          ) : addableResults.length === 0 ? (
            <Card className="bg-[#0f0f11] border-white/5">
              <CardContent className="py-14 flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <UserPlus className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-white font-semibold text-base">No matching students</p>
                <p className="text-gray-500 text-sm mt-1">No active students match "{debouncedAddSearch}".</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {addableResults.map((s) => (
                <Card key={s.studentId} className="bg-[#0f0f11] border-white/5">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={s.name} avatarUrl={s.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-base truncate">{s.name}</p>
                        <p className="text-gray-500 text-sm truncate">{s.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                      onClick={() => handleAddStudent(s.studentId)}
                      disabled={addingStudentId === s.studentId}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      {addingStudentId === s.studentId ? "Adding..." : "Add"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
