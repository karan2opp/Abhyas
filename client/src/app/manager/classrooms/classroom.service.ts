import api from "@/utils/axios";

// One page of the organisation's classrooms: `data` in the reply is { data, total, page, limit, hasMore }.
export const getOrganisationClassroomsService = async (search?: string, page = 1, limit = 9) => {
  const res = await api.get("/classrooms/org", { params: { search, page, limit } });
  return res.data;
};

export const updateClassroomService = async (id: string, data: { name?: string }) => {
  const res = await api.patch(`/classrooms/${id}`, data);
  return res.data;
};

export const deleteClassroomService = async (id: string) => {
  const res = await api.delete(`/classrooms/${id}`);
  return res.data;
};

// One page of the students: `data` in the reply is { data, total, page, limit, hasMore }.
export const getClassroomRosterService = async (id: string, search?: string, page = 1, limit = 12) => {
  const res = await api.get(`/classrooms/${id}/roster`, { params: { search, page, limit } });
  return res.data;
};

export const getClassroomTeachersService = async (id: string, search?: string) => {
  const res = await api.get(`/classrooms/${id}/teachers`, { params: { search } });
  return res.data;
};

export const addTeacherService = async (id: string, email: string) => {
  const res = await api.post(`/classrooms/${id}/teachers`, { email });
  return res.data;
};

export const removeTeacherService = async (id: string, teacherId: string) => {
  const res = await api.delete(`/classrooms/${id}/teachers/${teacherId}`);
  return res.data;
};

export const regenerateJoinCodeService = async (id: string, data?: { joinCodeExpiresInDays?: number; joinCodeMaxUses?: number }) => {
  const res = await api.post(`/classrooms/${id}/join-code/regenerate`, data || {});
  return res.data;
};

export const updateJoinCodeService = async (id: string, data: { joinCodeMaxUses: number }) => {
  const res = await api.patch(`/classrooms/${id}/join-code`, data);
  return res.data;
};

export const revokeJoinCodeService = async (id: string) => {
  const res = await api.post(`/classrooms/${id}/join-code/revoke`);
  return res.data;
};

export const inviteStudentService = async (id: string, email: string) => {
  const res = await api.post(`/classrooms/${id}/invite`, { email });
  return res.data;
};
