import api from "@/utils/axios";

export const getAdminsService = async () => {
  const res = await api.get("/superadmin/admins");
  return res.data;
};

export const assignAdminService = async (email: string) => {
  const res = await api.post("/superadmin/assign-admin", { email });
  return res.data;
};

export const revokeAdminService = async (email: string) => {
  const res = await api.post("/superadmin/revoke-admin", { email });
  return res.data;
};
