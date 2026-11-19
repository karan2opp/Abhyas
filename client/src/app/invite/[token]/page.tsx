"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/controls/button";
import { useAuthStore } from "@/store/authStore";
import { withRedirect } from "@/lib/redirect";
import { acceptInviteService, declineInviteService, getInviteService, type InviteInfo } from "../invite.service";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";

const STATUS_MESSAGE: Record<string, string> = {
  accepted: "This invitation has already been accepted.",
  declined: "This invitation was declined.",
  revoked: "This invitation was cancelled by the organisation.",
  expired: "This invitation has expired. Ask the organisation's manager to send a new one.",
};

// The page an invited teacher lands on from the email: who invited them, and Accept or Decline. Anyone with the link can see it
// and decline; accepting needs them to be signed in with the address the invitation was sent to.
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const logout = useAuthStore((s) => s.logout);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    getInviteService(token)
      .then(setInvite)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const here = `/invite/${token}`;

  const accept = async () => {
    setBusy("accept");
    try {
      await acceptInviteService(token);
      await fetchCurrentUser();
      toast.success(`You joined ${invite?.organisationName}`);
      router.push("/teacher");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not accept the invitation");
      setBusy(null);
    }
  };

  const decline = async () => {
    if (!confirm("Decline this invitation?")) return;
    setBusy("decline");
    try {
      await declineInviteService(token);
      setDeclined(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not decline the invitation");
    } finally {
      setBusy(null);
    }
  };

  const signedInEmail = user?.email?.toLowerCase() ?? null;
  const isCorrectAccount = !!invite && signedInEmail === invite.email.toLowerCase();
  const cannotBeTeacher = user?.role === "manager" || user?.role === "system_admin";

  let body: React.ReactNode;
  if (loading || !isInitialized) {
    body = (
      <div className="flex justify-center py-6 sm:py-8 md:py-10">
        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  } else if (notFound || !invite) {
    body = (
      <>
        <h1 className="text-2xl font-bold text-white">Invitation not found</h1>
        <p className="mt-3 text-sm text-gray-400">This link is not valid. Check that you copied all of it, or ask the organisation for a new invitation.</p>
      </>
    );
  } else if (declined) {
    body = (
      <>
        <h1 className="text-2xl font-bold text-white">Invitation declined</h1>
        <p className="mt-3 text-sm text-gray-400">You declined the invitation to {invite.organisationName}. You can close this page.</p>
      </>
    );
  } else if (invite.status !== "pending") {
    body = (
      <>
        <h1 className="text-2xl font-bold text-white">{invite.organisationName}</h1>
        <p className="mt-3 text-sm text-gray-400">{STATUS_MESSAGE[invite.status]}</p>
        {invite.status === "accepted" && isCorrectAccount && (
          <Link href="/teacher" className="mt-6 inline-block text-sm font-semibold text-orange-400 hover:underline">Go to your dashboard</Link>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-400">Invitation</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight break-words">{invite.organisationName}</h1>
        <p className="mt-3 text-sm text-gray-300 leading-relaxed">
          {invite.invitedBy ? <>{invite.invitedBy} has invited you</> : <>You have been invited</>} to join <strong className="text-white">{invite.organisationName}</strong> as a teacher.
        </p>
        <p className="mt-1 text-xs text-gray-500">Sent to {invite.email}</p>

        {!user ? (
          <>
            <p className="mt-8 text-sm text-gray-300">Sign in, or create an account, with <strong className="text-white">{invite.email}</strong> to accept.</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Link href={withRedirect("/auth/login", here)} className="inline-flex h-11 items-center justify-center rounded-lg bg-orange-600 px-6 text-sm font-semibold text-white hover:bg-orange-700">
                Sign in to accept
              </Link>
              <Link href={withRedirect("/auth/register", here)} className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-semibold text-gray-200 hover:bg-white/5">
                Create an account
              </Link>
            </div>
          </>
        ) : !isCorrectAccount ? (
          <>
            <p className="mt-8 text-sm text-amber-300">
              You are signed in as {user.email}, but this invitation was sent to {invite.email}.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={async () => {
                  await logout();
                  router.push(withRedirect("/auth/login", here));
                }}
                className="h-11 bg-orange-600 px-6 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Sign out and use {invite.email}
              </Button>
            </div>
          </>
        ) : cannotBeTeacher ? (
          <p className="mt-8 text-sm text-amber-300">A {user.role === "manager" ? "manager" : "system admin"} account cannot become a teacher, so this invitation cannot be accepted with it.</p>
        ) : (
          <>
            {user.role === "student" && <p className="mt-8 text-sm text-gray-400">Your account will become a teacher account.</p>}
            <div className={`${user.role === "student" ? "mt-4" : "mt-8"} flex flex-col sm:flex-row gap-3`}>
              <Button onClick={accept} disabled={busy !== null} className="h-11 bg-orange-600 px-4 sm:px-6 md:px-8 text-sm font-semibold text-white hover:bg-orange-700">
                {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
              </Button>
              <Button onClick={decline} disabled={busy !== null} variant="outline" className="h-11 border-white/15 bg-transparent px-4 sm:px-6 md:px-8 text-sm font-semibold text-gray-200 hover:bg-white/5">
                {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
              </Button>
            </div>
          </>
        )}

        {/* Declining needs no account, so it is offered to everyone who is not already looking at the Accept / Decline pair. */}
        {(!user || !isCorrectAccount) && (
          <button onClick={decline} disabled={busy !== null} className="mt-6 text-xs text-gray-500 underline hover:text-gray-300">
            Decline this invitation
          </button>
        )}
      </>
    );
  }

  return (
    <main className="min-h-dvh bg-[#050505] px-4 py-10 sm:py-16">
      <ThemeSwitch className="fixed right-3 top-3 z-20" />
      <div className="mx-auto w-full max-w-md">
        <p className="mb-10 text-lg font-semibold tracking-tight text-white">Abhyas</p>
        {body}
      </div>
    </main>
  );
}
