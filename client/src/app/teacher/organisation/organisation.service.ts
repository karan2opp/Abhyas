import api from "@/utils/axios";

export const getMyOrganisationService = async () => {
  const res = await api.get("/organisations/teacher-mine");
  return res.data;
};