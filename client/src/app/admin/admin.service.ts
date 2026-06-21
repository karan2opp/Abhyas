import api from "@/utils/axios";

export const getTeachersService = async () => {
  const res = await api.get("/admin/teachers");
  return res.data;
};

export const assignTeacherService = async (email: string) => {
  const res = await api.post("/admin/assign-teacher", { email });
  return res.data;
};

export const revokeTeacherService = async (email: string) => {
  const res = await api.post("/admin/revoke-teacher", { email });
  return res.data;
};

export const searchUserService = async (email: string) => {
  const res = await api.post("/admin/search-user", { email });
  return res.data;
};
