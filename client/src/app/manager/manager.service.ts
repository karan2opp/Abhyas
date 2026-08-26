import api from "@/utils/axios";

// ------------- ORGANISATION TEACHERS -------------
export const getMyOrganisationTeachersService = async (search?: string) => {
  const res = await api.get("/organisations/mine/teachers", { params: { search } });
  return res.data;
};

export const assignTeacherToMyOrganisationService = async (email: string) => {
  const res = await api.post("/organisations/mine/teachers", { email });
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
