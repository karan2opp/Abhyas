import api from "@/utils/axios";

export const getPlansService = async () => {
  const res = await api.get("/billing/plans");
  return res.data;
};

export const assignPlanService = async (
  organisationId: string,
  planId: string,
  customLimits?: Record<string, number>
) => {
  const res = await api.post("/billing/assign", { organisationId, planId, customLimits });
  return res.data;
};

export const getOrgSubscriptionService = async (organisationId: string) => {
  const res = await api.get(`/billing/subscriptions/${organisationId}`);
  return res.data;
};

export const getOrgUsageService = async (organisationId: string) => {
  const res = await api.get(`/billing/usage/${organisationId}`);
  return res.data;
};
