import api from "@/utils/axios";

export const joinOrganisationByCodeService = async (code: string) => {
  const res = await api.post("/organisations/join", { code });
  return res.data;
};