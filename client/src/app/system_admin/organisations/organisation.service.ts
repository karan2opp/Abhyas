import api from "@/utils/axios";

export const createOrganisationService = async (data: { name: string }) => {
  const res = await api.post("/organisations", data);
  return res.data;
};

export const getOrganisationsService = async () => {
  const res = await api.get("/organisations");
  return res.data;
};

export const getOrganisationManagersService = async (organisationId: string, search?: string) => {
  const res = await api.get(`/organisations/${organisationId}/managers`, { params: { search } });
  return res.data;
};

export const assignManagerService = async (organisationId: string, email: string) => {
  const res = await api.post(`/organisations/${organisationId}/managers`, { email });
  return res.data;
};

export const revokeManagerService = async (organisationId: string, userId: string) => {
  const res = await api.delete(`/organisations/${organisationId}/managers/${userId}`);
  return res.data;
};
