"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { joinOrganisationByCodeService } from "@/services/join.service";

export default function JoinOrganisationView() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace("/auth/login");
    } else if (user.role === "manager" || user.role === "system_admin") {
      router.replace(`/${user.role}`);
    }
  }, [user, isInitialized, router]);

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Enter your organisation join code");
      return;
    }
    setJoining(true);
    try {
      await joinOrganisationByCodeService(trimmed);
      toast.success("Joined organisation successfully");
      await fetchCurrentUser();
      router.push(`/${user?.role}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to join organisation");
    } finally {
      setJoining(false);
    }
  };

  if (!isInitialized) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-[#0f0f11] border-white/5">
        <CardHeader className="text-center">
          <div className="mx-auto bg-orange-600/20 border border-orange-500/30 rounded-2xl p-3 w-fit mb-3">
            <Building2 className="h-7 w-7 text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">Join an Organisation</CardTitle>
          <p className="text-gray-400 text-sm mt-1">
            Enter the join code shared by the manager of your organisation to get started.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-orange-400" /> Join Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="e.g. ABCDEF"
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all uppercase tracking-widest"
            />
          </div>
          <Button
            className="w-full bg-orange-600 hover:bg-orange-500 text-white"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
            {joining ? "Joining..." : "Join Organisation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}