"use client";

import React, { useEffect, useState } from "react";
import { Users, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/controls/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/display/card";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { pageCount } from "@/lib/page";
import {
  getMyOrganisationTeachersService,
  inviteTeacherService,
  getMyInvitesService,
  resendInviteService,
  revokeInviteService,
  demoteTeacherFromMyOrganisationService,
  type TeacherInvite,
} from "../manager.service";

interface Teacher {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function ManagerTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<TeacherInvite[]>([]);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const PAGE_SIZE = 10;
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherTotal, setTeacherTotal] = useState(0);
  const [invitePage, setInvitePage] = useState(1);
  const [inviteTotal, setInviteTotal] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // A new search is a new list, so it starts again from the first page.
  useEffect(() => {
    setTeacherPage(1);
  }, [debouncedSearch]);

  const fetchTeachers = async (search: string, page: number = teacherPage) => {
    setLoading(true);
    try {
      const res = await getMyOrganisationTeachersService(search || undefined, page, PAGE_SIZE);
      // The last teacher on the last page was demoted: show the page before it.
      if (res.data.length === 0 && page > 1) setTeacherPage(page - 1);
      setTeachers(res.data);
      setTeacherTotal(res.total);
    } catch {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers(debouncedSearch, teacherPage);
  }, [debouncedSearch, teacherPage]);

  // Accepted invitations are not listed (the server leaves them out): those people show up under Current Teachers.
  const fetchInvites = async (page: number = invitePage) => {
    try {
      const res = await getMyInvitesService(page, PAGE_SIZE);
      if (res.data.length === 0 && page > 1) setInvitePage(page - 1);
      setInvites(res.data);
      setInviteTotal(res.total);
    } catch {
      toast.error("Failed to load invitations");
    }
  };

  useEffect(() => {
    fetchInvites(invitePage);
  }, [invitePage]);

  const handleInvite = async () => {
    if (!email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      await inviteTeacherService(email.trim());
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send the invitation");
    } finally {
      setInviting(false);
      fetchInvites();
    }
  };

  const handleResend = async (invite: TeacherInvite) => {
    setBusyInvite(invite.id);
    try {
      await resendInviteService(invite.id);
      toast.success(`Invitation sent again to ${invite.email}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend the invitation");
    } finally {
      setBusyInvite(null);
      fetchInvites();
    }
  };

  const handleCancel = async (invite: TeacherInvite) => {
    if (!confirm(`Cancel the invitation to ${invite.email}?`)) return;
    setBusyInvite(invite.id);
    try {
      await revokeInviteService(invite.id);
      toast.success("Invitation cancelled");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel the invitation");
    } finally {
      setBusyInvite(null);
      fetchInvites();
    }
  };

  const handleDemote = async (userId: string, teacherEmail: string) => {
    if (!confirm(`Demote ${teacherEmail} back to a student role?`)) return;
    try {
      await demoteTeacherFromMyOrganisationService(userId);
      toast.success("Teacher demoted to student");
      fetchTeachers(debouncedSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to demote teacher");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Teachers</h2>
        <p className="text-gray-400 mt-1">Teachers who belong to your organisation.</p>
      </div>

      <Card className="bg-[#0f0f11] border-white/5 mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            Invite a Teacher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">
            We email them a link. They join your organisation as a teacher once they accept. A teacher can only belong to one organisation.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="teacher@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="flex-1 py-2.5 text-white placeholder:text-gray-600 transition-all text-sm border-b transition-colors placeholder:text-zinc-500 rounded-none border-0 border-white/20 bg-transparent px-0 focus:border-orange-500 focus:outline-none focus:ring-0"
            />
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleInvite} disabled={inviting}>
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {inviteTotal > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">Invitations ({inviteTotal})</h3>
          <div className="flex flex-col gap-2">
            {invites.map((i) => (
              <div key={i.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{i.email}</p>
                  <p className={`text-xs ${i.status === "pending" ? "text-amber-300" : "text-gray-500"}`}>
                    {i.status === "pending" && `Waiting for a reply · expires ${new Date(i.expiresAt).toLocaleDateString()}`}
                    {i.status === "expired" && "Expired"}
                    {i.status === "declined" && `Declined${i.respondedAt ? ` · ${new Date(i.respondedAt).toLocaleDateString()}` : ""}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(i.status === "pending" || i.status === "expired") && (
                    <Button size="sm" variant="outline" disabled={busyInvite === i.id} onClick={() => handleResend(i)} className="bg-transparent border-white/15 text-gray-200 hover:bg-white/5 h-8 px-3 text-xs font-semibold">
                      Resend
                    </Button>
                  )}
                  {(i.status === "pending" || i.status === "expired") && (
                    <Button size="sm" variant="outline" disabled={busyInvite === i.id} onClick={() => handleCancel(i)} className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs font-semibold">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={invitePage} totalPages={pageCount(inviteTotal, PAGE_SIZE)} onPageChange={setInvitePage} />
        </div>
      )}

      <h3 className="text-lg font-semibold text-white mb-3">Current Teachers ({teacherTotal})</h3>

      <div className="relative w-full max-w-md mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
        <input
          type="text"
          placeholder="Search teachers by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-white placeholder:text-zinc-400 h-11 text-sm transition-all pl-10 border-b transition-colors placeholder:text-zinc-500 rounded-none border-0 border-white/20 bg-transparent px-0 focus:border-orange-500 focus:outline-none focus:ring-0"
        />
      </div>

      {loading ? (
        <div className="text-white text-center py-6 sm:py-8 md:py-10">Loading teachers...</div>
      ) : teachers.length === 0 ? (
        <Card className="bg-[#0f0f11]/50 border-white/5 py-6 sm:py-8 md:py-10 text-center">
          <CardContent>
            <Users className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">
              {debouncedSearch ? `No teachers matching "${debouncedSearch}".` : "No teachers in your organisation yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {teachers.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
              <div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-gray-500 text-xs">{t.email}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 shrink-0 h-8 px-3 text-xs font-semibold"
                onClick={() => handleDemote(t.id, t.email)}
                title="Demote teacher back to student"
              >
                Demote
              </Button>
            </div>
          ))}
        </div>
      )}

      <Pagination page={teacherPage} totalPages={pageCount(teacherTotal, PAGE_SIZE)} onPageChange={setTeacherPage} />
    </div>
  );
}
