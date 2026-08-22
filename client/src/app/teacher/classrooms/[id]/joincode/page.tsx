"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Copy, RefreshCw, Ban, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { regenerateJoinCodeService, revokeJoinCodeService, inviteStudentService } from "../../classroom.service";
import { useClassroom } from "../ClassroomContext";
import { formatDateTime } from "@/lib/date";

export default function JoinCodePage() {
  const params = useParams();
  const classroomId = params.id as string;
  const { classroom, reloadClassroom } = useClassroom();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classroom.joinCode);
    toast.success("Join code copied");
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateJoinCodeService(classroomId);
      toast.success("Join code regenerated");
      await reloadClassroom();
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
      await reloadClassroom();
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

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Join Code</h3>
        <p className="text-gray-400 text-base mt-1">Share this code, or invite students individually by email.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-[#0f0f11] border-white/5">
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
                <div className="flex-1 px-4 py-3 bg-[#18181b] border border-white/10 rounded-lg font-mono text-lg text-emerald-400 tracking-widest text-center shadow-inner">
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

        <Card className="bg-[#0f0f11] border-white/5">
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
                className="flex-1 bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all text-sm shadow-inner"
              />
              <Button className="bg-orange-600 hover:bg-orange-700 text-white shrink-0" onClick={handleInvite} disabled={inviting}>
                {inviting ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
