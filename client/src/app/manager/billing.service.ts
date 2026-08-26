import api from "@/utils/axios";

// ------------- ORGANISATION DETAILS -------------
export const getMyOrganisationService = async () => {
  const res = await api.get("/organisations/mine");
  return res.data;
};

export const updateMyOrganisationService = async (data: {
  name?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
}) => {
  const res = await api.patch("/organisations/mine", data);
  return res.data;
};

export const uploadMyOrganisationLogoService = async (file: File) => {
  const formData = new FormData();
  formData.append("logo", file);
  const res = await api.post("/organisations/mine/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ------------- ORGANISATION JOIN CODE -------------
export const getMyOrganisationJoinCodeService = async () => {
  const res = await api.get("/organisations/mine/join-code");
  return res.data;
};

export const regenerateMyOrganisationJoinCodeService = async () => {
  const res = await api.post("/organisations/mine/join-code/regenerate");
  return res.data;
};

// ------------- SUBSCRIPTION -------------
export const getMySubscriptionService = async () => {
  const res = await api.get("/billing/subscriptions/mine");
  return res.data;
};

export const getMyUsageService = async () => {
  const res = await api.get("/billing/usage/mine");
  return res.data;
};

// ------------- PLANS -------------
export const getPlansService = async () => {
  const res = await api.get("/billing/plans");
  return res.data;
};

export const purchasePlanService = async (planId: string, customLimits?: Record<string, number>) => {
  const res = await api.post("/billing/purchase", { planId, customLimits });
  return res.data;
};
