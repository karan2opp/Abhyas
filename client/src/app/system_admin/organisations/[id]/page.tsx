"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Trash2, Crown, Search, CreditCard, Users, FileQuestion, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getOrganisationsService,
  getOrganisationManagersService,
  assignManagerService,
  revokeManagerService,
} from "../organisation.service";
import {
  getPlansService,
  assignPlanService,
  getOrgSubscriptionService,
  getOrgUsageService,
} from "../../billing.service";

interface Organisation {
  id: string;
  name: string;
  createdAt: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  isCustom: boolean;
  period: string;
  price: number;
  baseStudents: number;
  bufferStudents: number;
  maxQuestionGenerations: number;
  maxQuestionEvaluations: number;
  isActive: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  baseStudents: number;
  bufferStudents: number;
  maxQuestionGenerations: number;
  maxQuestionEvaluations: number;
  currentPeriodEnd?: string;
}

export default function OrganisationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organisationId = params.id as string;

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerEmail, setManagerEmail] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Subscription & usage
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<{ metric: string; count: number }[]>([]);
  const [activeStudents, setActiveStudents] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [customLimits, setCustomLimits] = useState({ baseStudents: 0, bufferStudents: 0, maxQuestionGenerations: 0, maxQuestionEvaluations: 0 });
  const [assigningPlan, setAssigningPlan] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadOrganisation = async () => {
    try {
      const orgsRes = await getOrganisationsService();
      const found = (orgsRes.data || []).find((o: Organisation) => o.id === organisationId);
      setOrganisation(found || null);
    } catch {
      toast.error("Failed to load organisation");
    }
  };

  const loadManagers = async (search: string) => {
    try {
      const managersRes = await getOrganisationManagersService(organisationId, search || undefined);
      setManagers(managersRes.data || []);
    } catch {
      toast.error("Failed to load managers");
    }
  };

  const loadBilling = async () => {
    try {
      const [plansRes, subRes, usageRes] = await Promise.all([
        getPlansService(),
        getOrgSubscriptionService(organisationId).catch(() => null),
        getOrgUsageService(organisationId).catch(() => null),
      ]);
      setPlans(plansRes.data || []);
      setSubscription(subRes?.data || null);
      setUsage(usageRes?.data?.usage || []);
      setActiveStudents(usageRes?.data?.activeStudents || 0);
    } catch {
      toast.error("Failed to load subscription data");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadOrganisation(), loadManagers(debouncedSearch), loadBilling()]);
    setLoading(false);
  };

  useEffect(() => {
    if (organisationId) loadAll();
  }, [organisationId]);

  useEffect(() => {
    if (organisationId && !loading) loadManagers(debouncedSearch);
  }, [debouncedSearch]);

  const handleAssignManager = async () => {
    if (!managerEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setAssigning(true);
    try {
      await assignManagerService(organisationId, managerEmail.trim());
      toast.success(`${managerEmail} is now a manager of this organisation`);
      setManagerEmail("");
      loadManagers(debouncedSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign manager");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeManager = async (userId: string, email: string) => {
    if (!confirm(`Revoke manager access for ${email}?`)) return;
    try {
      await revokeManagerService(organisationId, userId);
      toast.success("Manager revoked");
      loadManagers(debouncedSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke manager");
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlan) {
      toast.error("Select a plan");
      return;
    }
    const plan = plans.find(p => p.id === selectedPlan);
    const customLimitsPayload = plan?.isCustom ? customLimits : undefined;
    setAssigningPlan(true);
    try {
      await assignPlanService(organisationId, selectedPlan, customLimitsPayload);
      toast.success("Plan assigned to organisation");
      setAssignOpen(false);
      setSelectedPlan("");
      loadBilling();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign plan");
    } finally {
      setAssigningPlan(false);
    }
  };

  const usageFor = (metric: string) => usage.find(u => u.metric === metric)?.count || 0;
  const usagePct = (used: number, limit: number) => (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0);

  if (loading) return <div className="p-10 text-white text-center">Loading organisation...</div>;
  if (!organisation) return <div className="p-10 text-white text-center">Organisation not found</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <button
        onClick={() => router.push("/system_admin/organisations")}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Organisations
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">{organisation.name}</h2>
        <p className="text-gray-400 mt-1">Manage this organisation's owners (managers).</p>
      </div>

      <Card className="bg-[#0f0f11] border-white/5 mb-6">
        <CardContent>
          <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold mb-3">
            <UserPlus className="h-4 w-4" /> Assign a Manager
          </div>
          <p className="text-xs text-gray-500 mb-3">
            The user must already have an account. Assigning promotes their role to manager and links them to this organisation.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="manager@email.com"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAssignManager()}
              className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
            />
            <Button className="bg-red-600 hover:bg-red-500 text-white shrink-0" onClick={handleAssignManager} disabled={assigning}>
              {assigning ? "Assigning..." : "Assign Manager"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription & Usage */}
      <Card className="bg-[#0f0f11] border-white/5 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
              <CreditCard className="h-4 w-4" /> Subscription &amp; Usage
            </div>
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              onClick={() => { setSelectedPlan(subscription?.planId || ""); setAssignOpen(true); }}
            >
              {subscription ? "Change Plan" : "Assign Plan"}
            </Button>
          </div>

          {subscription ? (
            <>
              <div className="grid sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Plan</p>
                  <p className="text-lg font-bold text-white capitalize">{plans.find(p => p.id === subscription.planId)?.name || subscription.planId}</p>
                  <p className="text-[11px] text-gray-500 capitalize">{subscription.status}</p>
                </div>
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="text-lg font-bold text-white">{subscription.baseStudents.toLocaleString()}</p>
                  <p className="text-[11px] text-emerald-400">+ {subscription.bufferStudents} buffer</p>
                </div>
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Generation</p>
                  <p className="text-lg font-bold text-white">{subscription.maxQuestionGenerations.toLocaleString()}</p>
                </div>
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Evaluation</p>
                  <p className="text-lg font-bold text-white">{subscription.maxQuestionEvaluations.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Generation used", icon: FileQuestion, used: usageFor("question_generation"), limit: subscription.maxQuestionGenerations, accent: "bg-red-500" },
                  { label: "Evaluation used", icon: ClipboardCheck, used: usageFor("question_evaluation"), limit: subscription.maxQuestionEvaluations, accent: "bg-emerald-500" },
                  { label: "Students", icon: Users, used: activeStudents, limit: subscription.baseStudents + subscription.bufferStudents, accent: "bg-[#1652F0]" },
                ].map((m) => (
                  <div key={m.label} className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                      <m.icon className={`h-4 w-4 ${m.accent}`} /> {m.label}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>{m.used.toLocaleString()} / {m.limit.toLocaleString()}</span>
                      <span>{usagePct(m.used, m.limit)}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#1c1c1f] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.accent}`} style={{ width: `${usagePct(m.used, m.limit)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm">This organisation has no subscription yet.</p>
          )}
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold text-white mb-3">Managers ({managers.length})</h3>

      <div className="relative w-full sm:w-72 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
        <input
          type="text"
          placeholder="Search managers by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#14151f] border border-white/15 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-white/30 h-11 rounded-xl text-sm transition-all shadow-inner pl-10"
        />
      </div>

      {managers.length === 0 ? (
        <Card className="bg-[#0f0f11]/50 border-white/5 py-10 text-center">
          <CardContent>
            <Crown className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">
              {debouncedSearch ? `No managers matching "${debouncedSearch}".` : "No managers assigned yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {managers.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
              <div>
                <p className="text-white font-semibold text-sm">{m.name}</p>
                <p className="text-gray-500 text-xs">{m.email}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => handleRevokeManager(m.id, m.email)}
                title="Revoke manager"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Assign plan dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Assign Plan</DialogTitle></DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-gray-300">Select Plan</label>
            <div className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    selectedPlan === plan.id ? "border-red-500/50 bg-red-600/10" : "border-white/10 bg-[#09090b] hover:border-white/25"
                  }`}
                >
                  <span className="font-semibold capitalize text-white">{plan.name}</span>
                  <span className="text-xs text-gray-400">{plan.maxQuestionGenerations.toLocaleString()} gen • {plan.maxQuestionEvaluations.toLocaleString()} eval</span>
                </button>
              ))}
            </div>

            {plans.find(p => p.id === selectedPlan)?.isCustom && (
              <div className="space-y-3 pt-2">
                {([
                  ["baseStudents", "Students"],
                  ["bufferStudents", "Buffer students"],
                  ["maxQuestionGenerations", "Generation / month"],
                  ["maxQuestionEvaluations", "Evaluation / month"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-300">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={customLimits[key]}
                      onChange={(e) => setCustomLimits(f => ({ ...f, [key]: Number(e.target.value) || 0 }))}
                      className="w-full mt-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-500 text-white" onClick={handleAssignPlan} disabled={assigningPlan}>
              {assigningPlan ? "Assigning..." : "Assign Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
