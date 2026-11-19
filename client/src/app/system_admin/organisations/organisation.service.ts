import api from "@/utils/axios";

export const createOrganisationService = async (data: { name: string }) => {
  const res = await api.post("/organisations", data);
  return res.data;
};

// One page of the organisations (newest first).
export const getOrganisationsService = async (page = 1, limit = 12) => {
  const res = await api.get("/organisations", { params: { page, limit } });
  return res.data;
};

// One organisation, for its own page.
export const getOrganisationService = async (organisationId: string) => {
  const res = await api.get(`/organisations/${organisationId}`);
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

export const deleteOrganisationService = async (organisationId: string) => {
  const res = await api.delete(`/organisations/${organisationId}`);
  return res.data;
};
