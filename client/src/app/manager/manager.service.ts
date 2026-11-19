import api from "@/utils/axios";
import type { Page } from "@/lib/page";

// ------------- ORGANISATION TEACHERS -------------
export const getMyOrganisationTeachersService = async (search?: string, page = 1, limit = 10): Promise<Page<{ id: string; name: string; email: string; createdAt: string }>> => {
  const res = await api.get("/organisations/mine/teachers", { params: { search, page, limit } });
  return res.data.data;
};

export interface TeacherInvite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "declined" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
}

export const inviteTeacherService = async (email: string) => {
  const res = await api.post("/organisations/mine/invites", { email });
  return res.data;
};

export const getMyInvitesService = async (page = 1, limit = 10): Promise<Page<TeacherInvite>> => {
  const res = await api.get("/organisations/mine/invites", { params: { page, limit } });
  return res.data.data;
};

export const resendInviteService = async (inviteId: string) => {
  const res = await api.post(`/organisations/mine/invites/${inviteId}/resend`);
  return res.data;
};

export const revokeInviteService = async (inviteId: string) => {
  const res = await api.delete(`/organisations/mine/invites/${inviteId}`);
  return res.data;
};

export const removeTeacherFromMyOrganisationService = async (userId: string) => {
  const res = await api.delete(`/organisations/mine/teachers/${userId}`);
  return res.data;
};

export const demoteTeacherFromMyOrganisationService = async (userId: string) => {
  const res = await api.delete(`/organisations/mine/teachers/${userId}/demote`);
  return res.data;
};
