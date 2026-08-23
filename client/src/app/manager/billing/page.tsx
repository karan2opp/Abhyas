"use client";

import React, { useEffect, useState } from "react";
import { Building2, UserRound, FileQuestion, ClipboardCheck, Pencil, Check, Crown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getMyOrganisationService,
  updateMyOrganisationService,
  getMySubscriptionService,
  getMyUsageService,
  getPlansService,
  purchasePlanService,
} from "../billing.service";

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
  organisationId: string;
  planId: string;
  status: string;
  baseStudents: number;
  bufferStudents: number;
  maxQuestionGenerations: number;
  maxQuestionEvaluations: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

interface UsageRow {
  metric: string;
  count: number;
}

interface Organisation {
  id: string;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

function UsageMeter({ label, icon: Icon, used, limit, accent }: {
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
  accent: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <Card className="bg-[#0f0f11] border-white/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Icon className={`h-4 w-4 ${accent}`} />
            {label}
          </div>
          <span className="text-xs text-gray-500">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
        <div className="h-2 w-full bg-[#1c1c1f] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${accent}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{pct}% used this month</p>
      </CardContent>
    </Card>
  );
}

export default function ManagerBillingPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [activeStudents, setActiveStudents] = useState(0);

  // Org edit
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", contactEmail: "", phone: "", address: "" });
  const [savingOrg, setSavingOrg] = useState(false);

  // Purchase
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({ baseStudents: 0, bufferStudents: 0, maxQuestionGenerations: 0, maxQuestionEvaluations: 0 });
  const [savingCustom, setSavingCustom] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [orgRes, subRes, usageRes, plansRes] = await Promise.all([
        getMyOrganisationService(),
        getMySubscriptionService().catch(() => null),
        getMyUsageService(),
        getPlansService(),
      ]);
      setOrganisation(orgRes.data || null);
      setSubscription(subRes?.data || null);
      setUsage(usageRes.data?.usage || []);
      setActiveStudents(usageRes.data?.activeStudents || 0);
      setPlans(plansRes.data || []);
    } catch {
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const usageFor = (metric: string) => usage.find(u => u.metric === metric)?.count || 0;

  const handleEditOrg = async () => {
    setSavingOrg(true);
    try {
      await updateMyOrganisationService({
        name: editForm.name,
        contactEmail: editForm.contactEmail,
        phone: editForm.phone,
        address: editForm.address,
      });
      toast.success("Organisation updated");
      setEditOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update organisation");
    } finally {
      setSavingOrg(false);
    }
  };

  const handlePurchase = async (plan: Plan) => {
    setPurchasingPlan(plan.id);
    try {
      await purchasePlanService(plan.id);
      toast.success(`Subscribed to ${plan.name} plan`);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to purchase plan");
    } finally {
      setPurchasingPlan(null);
    }
  };

  const handleCustomPurchase = async () => {
    setSavingCustom(true);
    try {
      await purchasePlanService("custom", customForm);
      toast.success("Custom plan applied");
      setCustomOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to apply custom plan");
    } finally {
      setSavingCustom(false);
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading billing dashboard...</div>;

  const isCurrent = (plan: Plan) => subscription?.planId === plan.id;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Billing &amp; Usage</h2>
        <p className="text-gray-400 mt-1">Your subscription, plan limits and current usage.</p>
      </div>

      {/* Organisation details */}
      <Card className="bg-[#0f0f11] border-white/5 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-600/20 text-orange-400 rounded-lg flex items-center justify-center border border-orange-500/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{organisation?.name || "My Organisation"}</p>
                <p className="text-xs text-gray-500">
                  {organisation?.contactEmail || "No contact email set"} {organisation?.phone ? `• ${organisation.phone}` : ""}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white"
              onClick={() => {
                setEditForm({
                  name: organisation?.name || "",
                  contactEmail: organisation?.contactEmail || "",
                  phone: organisation?.phone || "",
                  address: organisation?.address || "",
                });
                setEditOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
          {organisation?.address && <p className="text-sm text-gray-400">{organisation.address}</p>}
        </CardContent>
      </Card>

      {/* Current plan */}
      <Card className="bg-gradient-to-br from-[#1a1a1f] to-[#0f0f11] border-white/10 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-1">
            <Crown className="h-5 w-5 text-amber-400" />
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Current Plan</p>
          </div>
          {subscription ? (
            <>
              <h3 className="text-2xl font-bold text-white capitalize mt-2">
                {plans.find(p => p.id === subscription.planId)?.name || subscription.planId}
              </h3>
              <p className="text-sm text-gray-400 mt-1 capitalize">
                {subscription.status} • monthly
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="text-lg font-bold text-white">{subscription.baseStudents.toLocaleString()}</p>
                  <p className="text-[11px] text-emerald-400">+ {subscription.bufferStudents} buffer</p>
                </div>
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Question Generation</p>
                  <p className="text-lg font-bold text-white">{subscription.maxQuestionGenerations.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">per month</p>
                </div>
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Question Evaluation</p>
                  <p className="text-lg font-bold text-white">{subscription.maxQuestionEvaluations.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">per month</p>
                </div>
                <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Active Students</p>
                  <p className="text-lg font-bold text-white">{activeStudents.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">of {subscription.baseStudents + subscription.bufferStudents}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 mt-2">
              No active subscription. Choose a plan below to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Usage meters */}
      <h3 className="text-lg font-semibold text-white mb-3">Usage This Month</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <UsageMeter
          label="Question Generation"
          icon={FileQuestion}
          used={usageFor("question_generation")}
          limit={subscription?.maxQuestionGenerations || 0}
          accent="bg-orange-500"
        />
        <UsageMeter
          label="Question Evaluation"
          icon={ClipboardCheck}
          used={usageFor("question_evaluation")}
          limit={subscription?.maxQuestionEvaluations || 0}
          accent="bg-emerald-500"
        />
        <UsageMeter
          label="Students (base + buffer)"
          icon={UserRound}
          used={activeStudents}
          limit={(subscription?.baseStudents || 0) + (subscription?.bufferStudents || 0)}
          accent="bg-[#1652F0]"
        />
      </div>

      {/* Plans */}
      <h3 className="text-lg font-semibold text-white mb-3">Plans</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const current = isCurrent(plan);
          return (
            <Card key={plan.id} className={`bg-[#0f0f11] border ${current ? "border-amber-500/40" : "border-white/5"} flex flex-col`}>
              <CardHeader>
                <CardTitle className="capitalize text-white">{plan.name} plan</CardTitle>
                <p className="text-xs text-gray-500 capitalize">{plan.period} • {plan.isCustom ? "custom limits" : "fixed limits"}</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="text-sm text-gray-300 space-y-1.5 flex-1">
                  <li className="flex justify-between"><span>Students</span><span className="text-white font-semibold">{plan.baseStudents.toLocaleString()}</span></li>
                  {!plan.isCustom && (
                    <li className="flex justify-between"><span>Student buffer</span><span className="text-emerald-400 font-semibold">+{plan.bufferStudents}</span></li>
                  )}
                  <li className="flex justify-between"><span>Generation</span><span className="text-white font-semibold">{plan.maxQuestionGenerations.toLocaleString()}</span></li>
                  <li className="flex justify-between"><span>Evaluation</span><span className="text-white font-semibold">{plan.maxQuestionEvaluations.toLocaleString()}</span></li>
                </ul>
                <div className="mt-4">
                  {current ? (
                    <div className="text-center text-sm font-semibold text-amber-400 flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" /> Current plan
                    </div>
                  ) : plan.isCustom ? (
                    <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white" onClick={() => setCustomOpen(true)}>
                      Configure Custom
                    </Button>
                  ) : (
                    <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white" disabled={purchasingPlan === plan.id} onClick={() => handlePurchase(plan)}>
                      {purchasingPlan === plan.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Switch to {plan.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit org dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Edit Organisation Details</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {([
              ["name", "Organisation Name", "text"],
              ["contactEmail", "Contact Email", "email"],
              ["phone", "Phone", "text"],
              ["address", "Address", "text"],
            ] as const).map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-300">{label}</label>
                <input
                  type={type}
                  value={editForm[key]}
                  onChange={(e) => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full mt-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-500 text-white" onClick={handleEditOrg} disabled={savingOrg}>
              {savingOrg ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom plan dialog */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Configure Custom Plan</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {([
              ["baseStudents", "Students"],
              ["bufferStudents", "Buffer students"],
              ["maxQuestionGenerations", "Question generation / month"],
              ["maxQuestionEvaluations", "Question evaluation / month"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-300">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={customForm[key]}
                  onChange={(e) => setCustomForm(f => ({ ...f, [key]: Number(e.target.value) || 0 }))}
                  className="w-full mt-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-500 text-white" onClick={handleCustomPurchase} disabled={savingCustom}>
              {savingCustom ? "Applying..." : "Apply Custom Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
