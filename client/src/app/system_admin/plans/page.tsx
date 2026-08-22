"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Users, FileQuestion, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getPlansService } from "../billing.service";

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

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPlansService();
        setPlans(res.data || []);
      } catch (err) {
        toast.error("Failed to load plans");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-10 text-white text-center">Loading plans...</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Subscription Plans</h2>
        <p className="text-gray-400 mt-1">The available plans. Assign plans to organisations from the organisation detail page.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-[#0f0f11] border-white/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-400" />
                <CardTitle className="capitalize text-white">{plan.name} plan</CardTitle>
              </div>
              <p className="text-xs text-gray-500 capitalize">
                {plan.period} • {plan.isCustom ? "custom limits" : "fixed limits"} • {plan.isActive ? "active" : "inactive"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300"><Users className="h-4 w-4 text-red-400" /> Students</div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{plan.baseStudents.toLocaleString()}</p>
                    <p className="text-[11px] text-emerald-400">+ {plan.bufferStudents} buffer</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300"><FileQuestion className="h-4 w-4 text-red-400" /> Generation</div>
                  <p className="text-lg font-bold text-white">{plan.maxQuestionGenerations.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between bg-[#0a0a0c] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300"><ClipboardCheck className="h-4 w-4 text-red-400" /> Evaluation</div>
                  <p className="text-lg font-bold text-white">{plan.maxQuestionEvaluations.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
